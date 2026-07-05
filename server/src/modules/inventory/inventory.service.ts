import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  LogTransactionInput,
  InventoryQuery,
} from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;

// ── Helpers ────────────────────────────────────────────────────────────────

function clinicScope(clinicId: string) {
  return { clinic_id: clinicId };
}

async function assertItem(id: string, clinicId: string) {
  const item = await prisma.inventoryItem.findFirst({ where: { id, ...clinicScope(clinicId) } });
  if (!item) throw Object.assign(new Error('Item not found'), { status: 404 });
  return item;
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
    return { items: filtered, hasMore: false, nextCursor: null };
  }

  const rows = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: 'asc' },
    take:    limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
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

  return {
    ...item,
    transactions: item.transactions.map((t) => ({
      ...t,
      performed_by_staff: perfMap.get(t.performed_by) ?? null,
    })),
  };
}

export async function createItem(clinicId: string, data: CreateInventoryItemInput) {
  if (data.sku) {
    const existing = await prisma.inventoryItem.findUnique({ where: { sku: data.sku } });
    if (existing) throw Object.assign(new Error('SKU already in use'), { status: 409 });
  }

  return prisma.inventoryItem.create({
    data: {
      clinic_id:         clinicId,
      name:              data.name,
      category:          data.category,
      unit:              data.unit,
      reorder_threshold: data.reorder_threshold ?? 10,
      unit_cost:         data.unit_cost,
      is_controlled:     data.is_controlled ?? false,
      ...(data.sku ? { sku: data.sku } : {}),
      ...(data.selling_price !== undefined ? { selling_price: data.selling_price } : {}),
      ...(data.supplier_name ? { supplier_name: data.supplier_name } : {}),
      ...(data.supplier_sku ? { supplier_sku: data.supplier_sku } : {}),
      ...(data.expiry_date ? { expiry_date: new Date(data.expiry_date) } : {}),
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
      ...(data.unit_cost !== undefined ? { unit_cost: data.unit_cost } : {}),
      ...(data.selling_price !== undefined ? { selling_price: data.selling_price } : {}),
      ...(data.supplier_name !== undefined ? { supplier_name: data.supplier_name } : {}),
      ...(data.supplier_sku !== undefined ? { supplier_sku: data.supplier_sku } : {}),
      ...(data.expiry_date !== undefined ? { expiry_date: new Date(data.expiry_date) } : {}),
      ...(data.location !== undefined ? { location: data.location } : {}),
      ...(data.is_controlled !== undefined ? { is_controlled: data.is_controlled } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      ...(data.sku !== undefined ? { sku: data.sku } : {}),
    },
  });
}

// ── Transactions ─────────────────────────────────────────────────────────────

/**
 * Core stock-change logic, composable into a caller-owned transaction (`tx`).
 * Prisma doesn't support nesting `$transaction` calls, so callers that need to
 * combine a stock change with other writes (e.g. EMR billing charges) pass
 * their own transaction client here instead of going through `logTransaction`.
 */
export async function applyStockChangeTx(
  tx:       TxClient,
  itemId:   string,
  clinicId: string,
  staffId:  string,
  data:     LogTransactionInput,
) {
  const item = await tx.inventoryItem.findFirst({ where: { id: itemId, clinic_id: clinicId } });
  if (!item) throw new AppError('NOT_FOUND', 'Item not found', 404);

  const resultingQuantity = item.quantity_on_hand + data.quantity;
  if (resultingQuantity < 0) {
    throw new AppError('CONFLICT', `Insufficient stock for "${item.name}"`, 409);
  }

  const txRecord = await tx.inventoryTransaction.create({
    data: {
      item_id:      itemId,
      performed_by: staffId,
      type:         data.type,
      quantity:     data.quantity,
      ...(data.reference_id ? { reference_id: data.reference_id } : {}),
      ...(data.notes ? { notes: data.notes } : {}),
    },
  });

  await tx.inventoryItem.update({
    where: { id: itemId },
    data:  { quantity_on_hand: resultingQuantity },
  });

  return txRecord;
}

export async function logTransaction(
  itemId:   string,
  clinicId: string,
  staffId:  string,
  data:     LogTransactionInput,
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
    where: { clinic_id: clinicId, is_active: true },
    orderBy: { name: 'asc' },
  });

  const now        = new Date();
  const in30Days   = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const lowStock   = all.filter((i) => i.quantity_on_hand <= i.reorder_threshold);
  const expiring   = all.filter((i) => i.expiry_date && i.expiry_date <= in30Days);

  return { low_stock: lowStock, expiring_soon: expiring };
}
