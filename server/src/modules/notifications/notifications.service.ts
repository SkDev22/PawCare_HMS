import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import type { NotificationQuery } from '@pawcare/shared';

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
