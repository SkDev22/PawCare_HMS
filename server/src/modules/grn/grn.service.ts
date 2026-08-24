import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { receiveBatchTx } from '../inventory/inventory.service';
import { resolveSupplierTx } from '../suppliers/suppliers.service';
import type { CreateGrnInput, GrnQuery } from '@pawcare/shared';

const grnIncludes = {
  received_by_staff: { select: { id: true, first_name: true, last_name: true } },
  supplier: { select: { id: true, name: true, phone: true, email: true } },
  items: {
    include: { item: { select: { id: true, name: true, unit: true } }, batch: true },
  },
} as const;

export async function listGrns(clinicId: string, query: GrnQuery) {
  const { search, cursor, limit } = query;

  const rows = await prisma.goodsReceivedNote.findMany({
    where: {
      clinic_id: clinicId,
      ...(search
        ? {
            OR: [
              { grn_number: { contains: search, mode: 'insensitive' as const } },
              { supplier_name: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
    },
    include: {
      received_by_staff: { select: { id: true, first_name: true, last_name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { received_at: 'desc' },
    take: limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getGrn(id: string, clinicId: string) {
  const grn = await prisma.goodsReceivedNote.findFirst({
    where:   { id, clinic_id: clinicId },
    include: grnIncludes,
  });
  if (!grn) throw new AppError('NOT_FOUND', 'Goods received note not found', 404);
  return grn;
}

export async function createGrn(clinicId: string, staffId: string, data: CreateGrnInput) {
  const itemIds = [...new Set(data.items.map((i) => i.item_id))];
  const foundItems = await prisma.inventoryItem.findMany({
    where: { id: { in: itemIds }, clinic_id: clinicId },
    select: { id: true },
  });
  if (foundItems.length !== itemIds.length) {
    throw new AppError('NOT_FOUND', 'One or more inventory items were not found in this clinic', 404);
  }

  const grnNumber = await nextGrnNumber(clinicId);

  return prisma.$transaction(async (tx) => {
    const supplier = await resolveSupplierTx(tx, clinicId, {
      ...(data.supplier_id ? { supplier_id: data.supplier_id } : {}),
      supplier_name: data.supplier_name,
    });

    const grn = await tx.goodsReceivedNote.create({
      data: {
        clinic_id:           clinicId,
        grn_number:          grnNumber,
        supplier_id:         supplier.id,
        supplier_name:       supplier.name,
        received_by:         staffId,
        ...(data.supplier_invoice_no ? { supplier_invoice_no: data.supplier_invoice_no } : {}),
        ...(data.notes ? { notes: data.notes } : {}),
      },
    });

    for (const line of data.items) {
      const grnItem = await tx.goodsReceivedNoteItem.create({
        data: {
          grn_id:           grn.id,
          item_id:          line.item_id,
          quantity:         line.quantity,
          unit_cost:        line.unit_cost,
          selling_price:    line.selling_price,
          discount_percent: line.discount_percent ?? 0,
          ...(line.batch_no ? { batch_no: line.batch_no } : {}),
          ...(line.expiry_date ? { expiry_date: new Date(line.expiry_date) } : {}),
        },
      });

      await receiveBatchTx(tx, clinicId, staffId, grnItem.id, line);
    }

    return tx.goodsReceivedNote.findUniqueOrThrow({ where: { id: grn.id }, include: grnIncludes });
  });
}

async function nextGrnNumber(clinicId: string): Promise<string> {
  const count = await prisma.goodsReceivedNote.count({ where: { clinic_id: clinicId } });
  return `GRN-${String(count + 1).padStart(6, '0')}`;
}
