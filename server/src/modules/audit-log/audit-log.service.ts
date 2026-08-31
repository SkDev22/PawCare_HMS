import { prisma } from '../../lib/prisma';
import type { AuditLogQueryInput } from '@pawcare/shared';

// Clinic-wide audit feed spanning EMR, billing, and staff mutations.
// Ordered newest-first, so the cursor is the last-seen row's created_at
// rather than its id — an ascending id cursor can't express "older than
// this" for a descending timestamp order.
export async function listAuditLog(clinicId: string, params: AuditLogQueryInput) {
  const { entity_type, medical_record_id, date_from, date_to, cursor, limit } = params;

  const createdAtFilter = {
    ...(cursor    ? { lt:  cursor }                                    : {}),
    ...(date_from ? { gte: new Date(`${date_from}T00:00:00.000Z`) }    : {}),
    ...(date_to   ? { lte: new Date(`${date_to}T23:59:59.999Z`) }      : {}),
  };

  const where = {
    clinic_id: clinicId,
    ...(entity_type       ? { entity_type }       : {}),
    ...(medical_record_id ? { medical_record_id } : {}),
    ...(Object.keys(createdAtFilter).length > 0 ? { created_at: createdAtFilter } : {}),
  };

  const entries = await prisma.auditLog.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
  });

  const hasMore = entries.length > limit;
  const page    = hasMore ? entries.slice(0, limit) : entries;

  const staffIds = [...new Set(page.map((e) => e.performed_by))];
  const staff =
    staffIds.length > 0
      ? await prisma.staffUser.findMany({
          where:  { id: { in: staffIds } },
          select: { id: true, first_name: true, last_name: true },
        })
      : [];
  const staffMap = new Map(staff.map((s) => [s.id, s]));

  return {
    items: page.map((e) => ({
      ...e,
      performed_by_staff: staffMap.get(e.performed_by) ?? null,
    })),
    nextCursor: hasMore ? page[page.length - 1].created_at.toISOString() : null,
    hasMore,
  };
}
