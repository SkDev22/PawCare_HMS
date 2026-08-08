import { Prisma, StaffRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { emitToStaff } from '../../lib/socket';
import type { NotificationQuery } from '@pawcare/shared';

type TxClient = Prisma.TransactionClient;

export async function listNotifications(staffId: string, params: NotificationQuery) {
  const where: Prisma.NotificationWhereInput = {
    staff_id:    staffId,
    ...(params.unread_only ? { read_at: null } : {}),
    ...(params.cursor ? { id: { lt: params.cursor } } : {}),
  };

  const limit = params.limit;
  const rows  = await prisma.notification.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take:    limit + 1,
  });

  const hasMore = rows.length > limit;
  const items   = hasMore ? rows.slice(0, limit) : rows;
  return { items, hasMore, nextCursor: hasMore ? items[items.length - 1].id : null };
}

export async function getUnreadCount(staffId: string) {
  const count = await prisma.notification.count({
    where: { staff_id: staffId, read_at: null },
  });
  return { count };
}

export async function markRead(id: string, staffId: string) {
  const notif = await prisma.notification.findFirst({ where: { id, staff_id: staffId } });
  if (!notif) throw Object.assign(new Error('Notification not found'), { status: 404 });
  if (notif.read_at) return notif;

  return prisma.notification.update({ where: { id }, data: { read_at: new Date() } });
}

export async function markAllRead(staffId: string) {
  const result = await prisma.notification.updateMany({
    where: { staff_id: staffId, read_at: null },
    data:  { read_at: new Date() },
  });
  return { updated: result.count };
}

// ── Producers ──────────────────────────────────────────────────────────────
// Called from inside other modules' transactions to create notification rows
// atomically with the business event they describe.

export async function notifyStaff(
  tx: TxClient | typeof prisma,
  params: { staff_id: string; type: string; subject?: string; body: string; reference_id?: string },
) {
  const notif = await tx.notification.create({
    data: {
      staff_id:     params.staff_id,
      type:         params.type,
      channel:      'in_app',
      subject:      params.subject ?? null,
      body:         params.body,
      status:       'SENT',
      sent_at:      new Date(),
      reference_id: params.reference_id ?? null,
    },
  });
  emitToStaff(params.staff_id, notif);
  return notif;
}

export async function notifyRole(
  tx: TxClient | typeof prisma,
  clinicId: string,
  roles: StaffRole[],
  params: { type: string; subject?: string; body: string; reference_id?: string },
  excludeStaffId?: string,
) {
  const staff = await tx.staffUser.findMany({
    where: {
      clinic_id:  clinicId,
      role:       { in: roles },
      is_active:  true,
      deleted_at: null,
      ...(excludeStaffId ? { id: { not: excludeStaffId } } : {}),
    },
    select: { id: true },
  });
  if (staff.length === 0) return;

  // Individual creates (not createMany) so each row's generated id is
  // available to emit live, and so a per-recipient dedup collision on
  // (staff_id, type, reference_id) can be caught and skipped without
  // failing the whole batch.
  await Promise.all(
    staff.map(async (s) => {
      try {
        const notif = await tx.notification.create({
          data: {
            staff_id:     s.id,
            type:         params.type,
            channel:      'in_app',
            subject:      params.subject ?? null,
            body:         params.body,
            status:       'SENT' as const,
            sent_at:      new Date(),
            reference_id: params.reference_id ?? null,
          },
        });
        emitToStaff(s.id, notif);
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          return; // already sent this reference_id to this staff member — expected on job re-runs
        }
        throw err;
      }
    }),
  );
}
