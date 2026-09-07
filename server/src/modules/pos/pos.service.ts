import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { clampZero } from '../billing/billing.service';
import { applyStockChangeTx, resolveBatchForSaleTx } from '../inventory/inventory.service';
import { recordAuditLog } from '../../lib/audit-log';
import type { CreatePosSaleInput, PosSaleQueryInput, CreatePosReturnInput } from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;
const { Decimal } = Prisma;
type Decimal = Prisma.Decimal;

const saleIncludes = {
  owner: {
    select: { id: true, first_name: true, last_name: true, email: true, phone: true },
  },
  line_items: {
    orderBy: { created_at: 'asc' as const },
    include: {
      item: { select: { id: true, name: true } },
    },
  },
  payments: {
    orderBy: { received_at: 'desc' as const },
  },
} as const;

// A Pet Shop checkout — one payment taken in full immediately, unlike a
// clinical invoice which starts DRAFT and is built up over a visit. Reuses
// the same batch-resolution + stock-deduction calls emr.service.ts's
// createChargeTx already makes for the exact same "sell an inventory item"
// operation.
export async function createSale(clinicId: string, staffId: string, data: CreatePosSaleInput) {
  if (data.owner_id) {
    const owner = await prisma.owner.findFirst({
      where: { id: data.owner_id, clinic_id: clinicId, deleted_at: null },
      select: { id: true },
    });
    if (!owner) throw new AppError('NOT_FOUND', 'Owner not found in this clinic', 404);
  }

  const clinic = await prisma.clinic.findUniqueOrThrow({
    where: { id: clinicId },
    select: { invoice_prefix: true, invoice_next_number: true, tax_rate: true },
  });

  const invoiceId = await prisma.$transaction(async (tx: TxClient) => {
    let subtotal = new Decimal(0);
    const resolvedLines: Array<{
      item_id: string;
      batch_id: string;
      description: string;
      quantity: number;
      unit_price: Decimal;
      total: Decimal;
    }> = [];

    for (const line of data.items) {
      const { batch, unitPrice } = await resolveBatchForSaleTx(
        tx,
        line.item_id,
        clinicId,
        line.quantity,
        line.batch_id,
      );
      const item = await tx.inventoryItem.findFirstOrThrow({
        where: { id: line.item_id },
        select: { name: true, category: true },
      });
      // Pet Shop only ever sells retail stock — medications and other
      // clinical inventory are dispensed through EMR, never rung up at the
      // register, regardless of the clinic's plan.
      if (item.category !== 'RETAIL') {
        throw new AppError('BAD_REQUEST', `"${item.name}" is not a Pet Shop item`, 400);
      }
      const lineTotal = unitPrice.times(line.quantity);
      subtotal = subtotal.plus(lineTotal);
      resolvedLines.push({
        item_id: line.item_id,
        batch_id: batch.id,
        description: item.name,
        quantity: line.quantity,
        unit_price: unitPrice,
        total: lineTotal,
      });
    }

    const tax = subtotal.times(clinic.tax_rate ?? 0).dividedBy(100).toDecimalPlaces(2);
    const discount = new Decimal(data.discount_amount ?? 0);
    const total = clampZero(subtotal.plus(tax).minus(discount));

    if (data.amount_tendered !== undefined && new Decimal(data.amount_tendered).lt(total)) {
      throw new AppError(
        'BAD_REQUEST',
        `Amount tendered (${data.amount_tendered}) is less than the total (${total.toFixed(2)})`,
        400,
      );
    }

    // Atomic increment: the value returned is the counter *after*
    // incrementing, so this sale's number is one less than that — same
    // pattern as billing.service.ts's createInvoice.
    const updated = await tx.clinic.update({
      where: { id: clinicId },
      data: { invoice_next_number: { increment: 1 } },
      select: { invoice_next_number: true },
    });
    const invoiceNumber = `${clinic.invoice_prefix}${String(updated.invoice_next_number - 1).padStart(5, '0')}`;

    const invoice = await tx.invoice.create({
      data: {
        clinic_id: clinicId,
        ...(data.owner_id
          ? { owner_id: data.owner_id }
          : data.customer_name
            ? { customer_name: data.customer_name }
            : {}),
        channel: 'RETAIL',
        invoice_number: invoiceNumber,
        status: 'PAID',
        subtotal,
        tax_amount: tax,
        tax_auto: true,
        discount_amount: discount,
        total,
        paid_amount: total,
      },
    });

    for (const line of resolvedLines) {
      await tx.invoiceLineItem.create({
        data: {
          invoice_id: invoice.id,
          item_id: line.item_id,
          batch_id: line.batch_id,
          description: line.description,
          quantity: line.quantity,
          unit_price: line.unit_price,
          total: line.total,
        },
      });

      await applyStockChangeTx(tx, line.item_id, clinicId, staffId, {
        type: 'dispensed',
        quantity: -line.quantity,
        batch_id: line.batch_id,
        reference_id: invoice.id,
        notes: 'Pet Shop sale',
      });
    }

    const payment = await tx.payment.create({
      data: {
        invoice_id: invoice.id,
        amount: total,
        method: data.payment_method,
        received_by: staffId,
        ...(data.amount_tendered !== undefined
          ? { amount_tendered: new Decimal(data.amount_tendered) }
          : {}),
      },
    });

    await recordAuditLog(tx, {
      clinicId,
      entityType: 'Payment',
      entityId: payment.id,
      action: 'CREATE',
      after: { invoice_id: invoice.id, amount: total.toString(), method: data.payment_method },
      performedBy: staffId,
    });

    return invoice.id;
  });

  return prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: saleIncludes });
}

export async function listSales(clinicId: string, query: PosSaleQueryInput) {
  const { cursor, limit } = query;

  const sales = await prisma.invoice.findMany({
    where: { clinic_id: clinicId, channel: 'RETAIL' },
    include: saleIncludes,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });

  const hasMore = sales.length > limit;
  const items = hasMore ? sales.slice(0, limit) : sales;

  return {
    items,
    nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    hasMore,
  };
}

// Kept as its own record rather than mutating the original sale (see the
// schema comment on PosReturn) — restocks each returned line back into the
// exact batch it was sold from, which stays correct even if that batch was
// fully depleted and closed by the original sale (applyStockChangeTx's
// batch_id path reopens a closed batch once quantity_remaining rises above 0).
export async function processReturn(
  clinicId: string,
  staffId: string,
  invoiceId: string,
  data: CreatePosReturnInput,
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, clinic_id: clinicId, channel: 'RETAIL' },
    select: { id: true, paid_amount: true, status: true },
  });
  if (!invoice) throw new AppError('NOT_FOUND', 'Pet Shop sale not found', 404);
  if (invoice.status === 'REFUNDED') {
    throw new AppError('BAD_REQUEST', 'This sale has already been fully refunded', 400);
  }

  const lineItemIds = data.lines.map((l) => l.line_item_id);
  const lineItems = await prisma.invoiceLineItem.findMany({
    where: { id: { in: lineItemIds }, invoice_id: invoiceId },
  });
  if (lineItems.length !== lineItemIds.length) {
    throw new AppError('BAD_REQUEST', 'One or more line items do not belong to this sale', 400);
  }

  // How much of each line item has already been returned across any prior
  // returns on this invoice, so a second partial return can't exceed what's left.
  const priorReturnLines = await prisma.posReturnLineItem.findMany({
    where: { line_item_id: { in: lineItemIds }, return: { invoice_id: invoiceId } },
    select: { line_item_id: true, quantity: true },
  });
  const alreadyReturned = new Map<string, number>();
  for (const r of priorReturnLines) {
    alreadyReturned.set(r.line_item_id, (alreadyReturned.get(r.line_item_id) ?? 0) + r.quantity);
  }

  let refundAmount = new Decimal(0);
  const resolvedLines: Array<{ lineItem: (typeof lineItems)[number]; quantity: number; amount: Decimal }> = [];

  for (const requested of data.lines) {
    const lineItem = lineItems.find((li) => li.id === requested.line_item_id)!;
    const returnedSoFar = alreadyReturned.get(lineItem.id) ?? 0;
    const remaining = lineItem.quantity - returnedSoFar;
    if (requested.quantity > remaining) {
      throw new AppError(
        'BAD_REQUEST',
        `Only ${remaining} unit(s) of "${lineItem.description}" remain returnable`,
        400,
      );
    }
    const amount = lineItem.unit_price.times(requested.quantity);
    refundAmount = refundAmount.plus(amount);
    resolvedLines.push({ lineItem, quantity: requested.quantity, amount });
  }

  await prisma.$transaction(async (tx) => {
    const posReturn = await tx.posReturn.create({
      data: {
        invoice_id: invoiceId,
        clinic_id: clinicId,
        reason: data.reason ?? null,
        refund_amount: refundAmount,
        refund_method: data.refund_method,
        processed_by: staffId,
      },
    });

    for (const { lineItem, quantity, amount } of resolvedLines) {
      await tx.posReturnLineItem.create({
        data: {
          return_id: posReturn.id,
          line_item_id: lineItem.id,
          quantity,
          amount,
        },
      });

      if (lineItem.item_id && lineItem.batch_id) {
        await applyStockChangeTx(tx, lineItem.item_id, clinicId, staffId, {
          type: 'adjustment',
          quantity,
          batch_id: lineItem.batch_id,
          reference_id: posReturn.id,
          notes: 'Pet Shop return',
        });
      }
    }

    // A sale is only fully REFUNDED once every one of its line items has
    // been returned in full, across however many separate returns it took.
    const allLineItems = await tx.invoiceLineItem.findMany({
      where: { invoice_id: invoiceId },
      select: { id: true, quantity: true },
    });
    const allReturnLines = await tx.posReturnLineItem.findMany({
      where: { return: { invoice_id: invoiceId } },
      select: { line_item_id: true, quantity: true },
    });
    const returnedTotals = new Map<string, number>();
    for (const r of allReturnLines) {
      returnedTotals.set(r.line_item_id, (returnedTotals.get(r.line_item_id) ?? 0) + r.quantity);
    }
    const fullyReturned = allLineItems.every((li) => (returnedTotals.get(li.id) ?? 0) >= li.quantity);

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        paid_amount: clampZero(invoice.paid_amount.minus(refundAmount)),
        ...(fullyReturned ? { status: 'REFUNDED' } : {}),
      },
    });

    await recordAuditLog(tx, {
      clinicId,
      entityType: 'PosReturn',
      entityId: posReturn.id,
      action: 'CREATE',
      after: {
        invoice_id: invoiceId,
        refund_amount: refundAmount.toString(),
        refund_method: data.refund_method,
        reason: data.reason ?? null,
      },
      performedBy: staffId,
    });
  });

  return prisma.invoice.findUniqueOrThrow({ where: { id: invoiceId }, include: saleIncludes });
}
