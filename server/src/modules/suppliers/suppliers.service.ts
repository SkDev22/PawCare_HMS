import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { SupplierQuery } from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;

export async function listSuppliers(clinicId: string, query: SupplierQuery) {
  return prisma.supplier.findMany({
    where: {
      clinic_id: clinicId,
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: { name: 'asc' },
    take:    query.limit,
  });
}

/**
 * Resolves the supplier a GRN should link to: reuses an existing supplier by
 * id (or by a case-insensitive name match, so retyping "Acme" doesn't create
 * a duplicate), or creates a new one the first time a name is used. Composable
 * into a caller-owned transaction (Prisma doesn't support nesting $transaction).
 */
export async function resolveSupplierTx(
  tx:       TxClient,
  clinicId: string,
  data:     { supplier_id?: string; supplier_name: string },
) {
  if (data.supplier_id) {
    const existing = await tx.supplier.findFirst({
      where: { id: data.supplier_id, clinic_id: clinicId },
    });
    if (existing) return existing;
  }

  const byName = await tx.supplier.findFirst({
    where: { clinic_id: clinicId, name: { equals: data.supplier_name, mode: 'insensitive' } },
  });
  if (byName) return byName;

  return tx.supplier.create({
    data: { clinic_id: clinicId, name: data.supplier_name },
  });
}
