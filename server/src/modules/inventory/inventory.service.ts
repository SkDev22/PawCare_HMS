import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { notifyRole } from '../notifications/notifications.service';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  LogTransactionInput,
  InventoryQuery,
  GrnLineItemInput,
} from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;

// ── Helpers ────────────────────────────────────────────────────────────────

function clinicScope(clinicId: string) {
  return { clinic_id: clinicId };
}

async function assertItem(id: string, clinicId: string) {
  const item = await prisma.inventoryItem.findFirst({ where: { id, ...clinicScope(clinicId) } });
  if (!item) throw new AppError('NOT_FOUND', 'Item not found', 404);
  return item;
}

// Oldest-first consumption order: nearest expiry first, then oldest received.
// Batches with no expiry date sort after ones that do have one.
const FIFO_ORDER = [
  { expiry_date: { sort: 'asc' as const, nulls: 'last' as const } },
  { received_at: 'asc' as const },
];

function activeBatchWhere(itemId: string) {
  return { item_id: itemId, is_closed: false, quantity_remaining: { gt: 0 } };
}

function effectivePrice(batch: { selling_price: Prisma.Decimal; discount_percent: Prisma.Decimal }) {
  const { Decimal } = Prisma;
  return new Decimal(batch.selling_price).times(new Decimal(1).minus(new Decimal(batch.discount_percent).dividedBy(100)));
}

async function batchAggregatesByItem(itemIds: string[]) {
  const map = new Map<string, { current_price: string | null; nearest_expiry: Date | null }>();
  if (itemIds.length === 0) return map;

  const batches = await prisma.stockBatch.findMany({
    where: { item_id: { in: itemIds }, is_closed: false, quantity_remaining: { gt: 0 } },
    orderBy: FIFO_ORDER,
  });

  for (const itemId of itemIds) map.set(itemId, { current_price: null, nearest_expiry: null });

  for (const batch of batches) {
    const entry = map.get(batch.item_id);
    if (!entry) continue;
    if (entry.current_price === null) {
      entry.current_price = effectivePrice(batch).toFixed(2);
    }
    if (batch.expiry_date && (entry.nearest_expiry === null || batch.expiry_date < entry.nearest_expiry)) {
      entry.nearest_expiry = batch.expiry_date;
    }
  }

  return map;
}

// ── CRUD ──────────────────────────────────────────────────────────────────

export async function listItems(clinicId: string, params: InventoryQuery) {
  const where: Prisma.InventoryItemWhereInput = {
    ...clinicScope(clinicId),
    ...(params.category ? { category: params.category } : {}),
    ...(params.is_active !== undefined ? { is_active: params.is_active } : { is_active: true }),
    ...(params.search
      ? { name: { contains: params.search, mode: 'insensitive' as const } }
      : {}),
    ...(params.cursor ? { id: { lt: params.cursor } } : {}),
  };

  const limit = params.limit;

  async function withAggregates<T extends { id: string }>(items: T[]) {
    const aggregates = await batchAggregatesByItem(items.map((i) => i.id));
    return items.map((i) => ({ ...i, ...(aggregates.get(i.id) ?? { current_price: null, nearest_expiry: null }) }));
  }

  // For low_stock we need the comparison field-to-field which Prisma doesn't support natively.
  // Use a separate approach: fetch all active items and filter in-process when low_stock requested.
  if (params.low_stock) {
    const all = await prisma.inventoryItem.findMany({
      where: {
        ...clinicScope(clinicId),
        ...(params.category ? { category: params.category } : {}),
        is_active: true,
        ...(params.search ? { name: { contains: params.search, mode: 'insensitive' as const } } : {}),
      },
      orderBy: { name: 'asc' },
    });
    const filtered = all.filter((i) => i.quantity_on_hand <= i.reorder_threshold);
    return { items: await withAggregates(filtered), hasMore: false, nextCursor: null };
  }

  const rows = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: 'asc' },
    take:    limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;
  return { items: await withAggregates(items), hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getItem(id: string, clinicId: string) {
  const item = await prisma.inventoryItem.findFirst({
    where:   { id, ...clinicScope(clinicId) },
    include: {
      transactions: {
        orderBy: { created_at: 'desc' },
        take:    20,
      },
    },
  });
  if (!item) return null;

  // Fetch performer details for recent transactions
  const perfIds = [...new Set(item.transactions.map((t) => t.performed_by))];
  const performers =
    perfIds.length > 0
      ? await prisma.staffUser.findMany({
          where:  { id: { in: perfIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
  const perfMap = new Map(performers.map((p) => [p.id, p]));

  const aggregates = (await batchAggregatesByItem([item.id])).get(item.id) ?? {
    current_price: null,
    nearest_expiry: null,
  };

  return {
    ...item,
    ...aggregates,
    transactions: item.transactions.map((t) => ({
      ...t,
      performed_by_staff: perfMap.get(t.performed_by) ?? null,
    })),
  };
}

export async function createItem(clinicId: string, data: CreateInventoryItemInput) {
  if (data.sku) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
    if (existing) throw new AppError('CONFLICT', 'SKU already in use', 409);
  }

  return prisma.inventoryItem.create({
    data: {
      clinic_id:         clinicId,
      name:              data.name,
      category:          data.category,
      unit:              data.unit,
      reorder_threshold: data.reorder_threshold ?? 10,
      is_controlled:     data.is_controlled ?? false,
      ...(data.sku ? { sku: data.sku } : {}),
      ...(data.supplier_name ? { supplier_name: data.supplier_name } : {}),
      ...(data.supplier_sku ? { supplier_sku: data.supplier_sku } : {}),
      ...(data.location ? { location: data.location } : {}),
    },
  });
}

export async function updateItem(id: string, clinicId: string, data: UpdateInventoryItemInput) {
  await assertItem(id, clinicId);

  return prisma.inventoryItem.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.category !== undefined ? { category: data.category } : {}),
      ...(data.unit !== undefined ? { unit: data.unit } : {}),
      ...(data.reorder_threshold !== undefined ? { reorder_threshold: data.reorder_threshold } : {}),
      ...(data.supplier_name !== undefined ? { supplier_name: data.supplier_name } : {}),
      ...(data.supplier_sku !== undefined ? { supplier_sku: data.supplier_sku } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.is_controlled !== undefined ? { is_controlled: data.is_controlled } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
    },
  });
}

/**
 * Only allowed for an item that's never actually been stocked — no batch was
 * ever received and no transaction was ever logged against it. Once stock
 * history exists, other records (GRN lines, charges, invoices) point at it,
 * so deleting would either break referential integrity or quietly erase
 * audit history; deactivating (see updateItem/is_active) is the only option
 * at that point, same as how staff are deactivated rather than deleted.
 */
export async function deleteItem(id: string, clinicId: string) {
  await assertItem(id, clinicId);

  const [batchCount, transactionCount] = await Promise.all([
    prisma.stockBatch.count({ where: { item_id: id } }),
    prisma.inventoryTransaction.count({ where: { item_id: id } }),
  ]);
  if (batchCount > 0 || transactionCount > 0) {
    throw new AppError(
      'BAD_REQUEST',
      'This item has stock history and cannot be deleted — deactivate it instead.',
      400,
    );
  }

  await prisma.inventoryItem.delete({ where: { id } });
}

// ── Batches ───────────────────────────────────────────────────────────────

export async function listBatches(itemId: string, clinicId: string) {
  await assertItem(itemId, clinicId);

  return prisma.stockBatch.findMany({
    where:   { item_id: itemId },
    orderBy: [{ is_closed: 'asc' }, ...FIFO_ORDER],
  });
}

/**
 * Picks the batch a sale/dispense should draw its price from (oldest active
 * batch, FIFO order) and asserts it can cover the whole requested quantity.
 * Selling across a batch boundary would mean one invoice line billed at two
 * different prices, so instead of blending prices we ask the caller to split
 * the sale into two line items once a batch runs out.
 */
export async function resolveBatchForSaleTx(
  tx: TxClient,
  itemId: string,
  clinicId: string,
  quantity: number,
) {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, clinic_id: clinicId } });
  if (!item) throw new AppError('NOT_FOUND', 'Item not found', 404);

  const batch = await tx.stockBatch.findFirst({
    where:   activeBatchWhere(itemId),
    orderBy: FIFO_ORDER,
  });
  if (!batch) throw new AppError('BAD_REQUEST', `No stock available for "${item.name}"`, 400);

  if (batch.quantity_remaining < quantity) {
    throw new AppError(
      'BAD_REQUEST',
      `Only ${batch.quantity_remaining} unit(s) of "${item.name}" left at the current price — bill the remainder as a separate line item.`,
      400,
    );
  }

  return { batch, unitPrice: effectivePrice(batch) };
}

/**
 * Creates a new stock batch from a received GRN line, composable into the
 * caller-owned GRN transaction (Prisma doesn't support nesting $transaction).
 */
export async function receiveBatchTx(
  tx:       TxClient,
  clinicId: string,
  staffId:  string,
  grnItemId: string,
  data: GrnLineItemInput,
) {
  const item = await tx.inventoryItem.findFirst({ where: { id: data.item_id, clinic_id: clinicId } });
  if (!item) throw new AppError('NOT_FOUND', 'Item not found', 404);

  const batch = await tx.stockBatch.create({
    data: {
      item_id:            data.item_id,
      grn_item_id:        grnItemId,
      quantity_received:  data.quantity,
      quantity_remaining: data.quantity,
      unit_cost:          data.unit_cost,
      selling_price:      data.selling_price,
      discount_percent:   data.discount_percent ?? 0,
      ...(data.batch_no ? { batch_no: data.batch_no } : {}),
      ...(data.expiry_date ? { expiry_date: new Date(data.expiry_date) } : {}),
    },
  });

  await tx.inventoryTransaction.create({
    data: {
      item_id:      data.item_id,
      batch_id:     batch.id,
      performed_by: staffId,
      type:         'purchase',
      quantity:     data.quantity,
      reference_id: grnItemId,
    },
  });

  await tx.inventoryItem.update({
    where: { id: data.item_id },
    data:  { quantity_on_hand: { increment: data.quantity } },
  });

  return batch;
}

// ── Transactions ─────────────────────────────────────────────────────────────

/**
 * Core stock-change logic, composable into a caller-owned transaction (`tx`).
 *
 * - `batch_id` given: adjusts that exact batch's quantity_remaining (manual
 *   "this batch expired / count correction" actions, and EMR's price-pinned
 *   sale/reversal).
 * - `batch_id` omitted, type `dispensed` with a negative quantity: walks
 *   active batches oldest-first (FIFO) and consumes across as many as needed.
 * - `batch_id` omitted otherwise: legacy/plain item-level ledger entry with
 *   no batch attribution (kept so reversing a pre-batch-tracking charge still
 *   works, and so `quantity_on_hand` never desyncs from actual batch totals
 *   in that edge case).
 */
export async function applyStockChangeTx(
  tx:       TxClient,
  itemId:   string,
  clinicId: string,
  staffId:  string,
  data:     LogTransactionInput & { batch_id?: string },
) {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, clinic_id: clinicId } });
  if (!item) throw new AppError('NOT_FOUND', 'Item not found', 404);

  const resultingQuantity = item.quantity_on_hand + data.quantity;
  if (resultingQuantity < 0) {
    throw new AppError('CONFLICT', `Insufficient stock for "${item.name}"`, 409);
  }

  const segments: Array<{ batch_id: string; quantity: number }> = [];

  if (data.batch_id) {
    const batch = await tx.stockBatch.findFirst({ where: { id: data.batch_id, item_id: itemId } });
    if (!batch) throw new AppError('NOT_FOUND', 'Batch not found', 404);

    const newRemaining = batch.quantity_remaining + data.quantity;
    if (newRemaining < 0) {
      throw new AppError('CONFLICT', `Insufficient stock in the selected batch for "${item.name}"`, 409);
    }

    await tx.stockBatch.update({
      where: { id: batch.id },
      data:  { quantity_remaining: newRemaining, is_closed: newRemaining <= 0 },
    });
    segments.push({ batch_id: batch.id, quantity: data.quantity });
  } else if (data.type === 'dispensed' && data.quantity < 0) {
    let remainingToConsume = -data.quantity;
    const activeBatches = await tx.stockBatch.findMany({
      where:   activeBatchWhere(itemId),
      orderBy: FIFO_ORDER,
    });

    const totalAvailable = activeBatches.reduce((sum, b) => sum + b.quantity_remaining, 0);
    if (totalAvailable < remainingToConsume) {
      throw new AppError('CONFLICT', `Insufficient stock for "${item.name}"`, 409);
    }

    for (const batch of activeBatches) {
      if (remainingToConsume <= 0) break;
      const take = Math.min(batch.quantity_remaining, remainingToConsume);
      const newRemaining = batch.quantity_remaining - take;
      await tx.stockBatch.update({
        where: { id: batch.id },
        data:  { quantity_remaining: newRemaining, is_closed: newRemaining <= 0 },
      });
      segments.push({ batch_id: batch.id, quantity: -take });
      remainingToConsume -= take;
    }
  } else {
    segments.push({ batch_id: '', quantity: data.quantity });
  }

  const txRecords = [];
  for (const segment of segments) {
    const record = await tx.inventoryTransaction.create({
      data: {
        item_id:      itemId,
        performed_by: staffId,
        type:         data.type,
        quantity:     segment.quantity,
        ...(segment.batch_id ? { batch_id: segment.batch_id } : {}),
        ...(data.reference_id ? { reference_id: data.reference_id } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
    });
    txRecords.push(record);
  }

  await tx.inventoryItem.update({
    where: { id: itemId },
    data:  { quantity_on_hand: resultingQuantity },
  });

  if (item.quantity_on_hand > item.reorder_threshold && resultingQuantity <= item.reorder_threshold) {
    await notifyRole(tx, clinicId, ['ADMIN', 'NURSE'], {
      type:    'low_stock',
      subject: 'Low Stock Alert',
      body:    `${item.name} is now at ${resultingQuantity} ${item.unit} (reorder threshold: ${item.reorder_threshold}).`,
    });
  }

  if (item.is_controlled && data.type === 'dispensed') {
    await notifyRole(tx, clinicId, ['ADMIN'], {
      type:    'controlled_substance_dispensed',
      subject: 'Controlled Substance Dispensed',
      body:    `${Math.abs(data.quantity)} ${item.unit} of ${item.name} dispensed.`,
    });
  }

  return txRecords[txRecords.length - 1];
}

export async function logTransaction(
  itemId:   string,
  clinicId: string,
  staffId:  string,
  data:     LogTransactionInput & { batch_id?: string },
) {
  return prisma.$transaction((tx) => applyStockChangeTx(tx, itemId, clinicId, staffId, data));
}

export async function listTransactions(itemId: string, clinicId: string, cursor?: string, limit = 20) {
  await assertItem(itemId, clinicId);

  const rows = await prisma.inventoryTransaction.findMany({
    where:   { item_id: itemId, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { created_at: 'desc' },
    take:    limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;

  const perfIds = [...new Set(items.map((r) => r.performed_by))];
  const performers =
    perfIds.length > 0
      ? await prisma.staffUser.findMany({
          where:  { id: { in: perfIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
  const perfMap = new Map(performers.map((p) => [p.id, p]));

  return {
    items: items.map((r) => ({ ...r, performed_by_staff: perfMap.get(r.performed_by) ?? null })),
    hasMore,
    nextCursor: hasMore ? items[items.length - 1].id : null,
  };
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(clinicId: string) {
  const all = await prisma.inventoryItem.findMany({
    where:   { clinic_id: clinicId, is_active: true },
    orderBy: { name: 'asc' },
  });

  const lowStock = all.filter((i) => i.quantity_on_hand <= i.reorder_threshold);
  const lowStockAggregates = await batchAggregatesByItem(lowStock.map((i) => i.id));
  const lowStockWithPrice = lowStock.map((i) => ({
    ...i,
    ...(lowStockAggregates.get(i.id) ?? { current_price: null, nearest_expiry: null }),
  }));

  const now      = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const expiringBatches = await prisma.stockBatch.findMany({
    where: {
      item: { clinic_id: clinicId },
      is_closed: false,
      quantity_remaining: { gt: 0 },
      expiry_date: { lte: in30Days },
    },
    include: { item: { select: { id: true, name: true, unit: true } } },
    orderBy: FIFO_ORDER,
  });

  return { low_stock: lowStockWithPrice, expiring_soon: expiringBatches };
}
