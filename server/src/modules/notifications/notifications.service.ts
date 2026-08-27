import { Prisma, StaffRole } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { emitToStaff } from '../../lib/socket';
import { sendEmail } from '../../services/sendgrid';
import { NOTIFICATION_TYPES } from '@pawcare/shared';
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

export async function deleteReadNotifications(staffId: string) {
  const result = await prisma.notification.deleteMany({
    where: { staff_id: staffId, read_at: { not: null } },
  });
  return { deleted: result.count };
}

const RETENTION_DAYS = 90;

// Keeps the table bounded without ever touching unread rows — an old unread
// alert usually means something still hasn't been handled.
export async function purgeOldReadNotifications(days = RETENTION_DAYS) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  const result = await prisma.notification.deleteMany({
    where: { read_at: { not: null, lt: cutoff } },
  });
  return { deleted: result.count };
}

// ── Preferences ────────────────────────────────────────────────────────────────
// Opt-out model: absence of a row means enabled. Only explicit disables are
// stored, so there's nothing to seed when a new notification type is added.

export async function getPreferences(staffId: string) {
  const overrides = await prisma.notificationPreference.findMany({
    where:  { staff_id: staffId },
    select: { type: true, enabled: true },
  });
  const overrideMap = new Map(overrides.map((o) => [o.type, o.enabled]));

  return NOTIFICATION_TYPES.map((t) => ({
    type:    t.type,
    label:   t.label,
    enabled: overrideMap.get(t.type) ?? true,
  }));
}

export async function updatePreferences(
  staffId: string,
  preferences: { type: string; enabled: boolean }[],
) {
  await Promise.all(
    preferences.map((p) =>
      prisma.notificationPreference.upsert({
        where:  { staff_id_type: { staff_id: staffId, type: p.type } },
        create: { staff_id: staffId, type: p.type, enabled: p.enabled },
        update: { enabled: p.enabled },
      }),
    ),
  );
  return getPreferences(staffId);
}

async function isEnabled(tx: TxClient | typeof prisma, staffId: string, type: string) {
  const pref = await tx.notificationPreference.findUnique({
    where:  { staff_id_type: { staff_id: staffId, type } },
    select: { enabled: true },
  });
  return pref?.enabled ?? true;
}

// ── Producers ──────────────────────────────────────────────────────────────
// Called from inside other modules' transactions to create notification rows
// atomically with the business event they describe.

export async function notifyStaff(
  tx: TxClient | typeof prisma,
  params: { staff_id: string; type: string; subject?: string; body: string; reference_id?: string },
) {
  if (!(await isEnabled(tx, params.staff_id, params.type))) return null;

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
      if (!(await isEnabled(tx, s.id, params.type))) return;
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

// ── Owner-facing (email) ─────────────────────────────────────────────────────
// Unlike notifyStaff/notifyRole (in-app only), this actually attempts delivery
// — currently email via SendGrid, since that's the only wired-up channel.
// Respects Owner.preferred_contact: an owner who asked for sms/phone gets a
// SKIPPED row rather than an email we weren't asked to send.

const SEND_RETRY_DELAYS_MS = [500, 1500, 4000];

async function sendWithRetry(
  fn: () => Promise<void>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= SEND_RETRY_DELAYS_MS.length; attempt++) {
    try {
      await fn();
      return { ok: true };
    } catch (err) {
      lastError = err;
      const delay = SEND_RETRY_DELAYS_MS[attempt];
      if (delay === undefined) break;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const message = lastError instanceof Error ? lastError.message : 'Unknown error';
  return { ok: false, error: message.slice(0, 500) };
}

export async function notifyOwner(
  tx: TxClient | typeof prisma,
  params: { owner_id: string; type: string; subject: string; body: string; reference_id: string },
) {
  const owner = await tx.owner.findUnique({
    where:  { id: params.owner_id },
    select: { email: true, preferred_contact: true },
  });
  if (!owner) return null;

  const canEmail = owner.preferred_contact === 'email' && !!owner.email;

  let notif;
  try {
    notif = await tx.notification.create({
      data: {
        owner_id:     params.owner_id,
        type:         params.type,
        channel:      canEmail ? 'email' : owner.preferred_contact,
        subject:      params.subject,
        body:         params.body,
        status:       canEmail ? 'PENDING' : 'SKIPPED',
        reference_id: params.reference_id,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return null; // already sent this reference_id to this owner — expected on job re-runs
    }
    throw err;
  }

  if (!canEmail) return notif;

  const result = await sendWithRetry(() =>
    sendEmail({ to: owner.email as string, subject: params.subject, html: params.body }),
  );

  return tx.notification.update({
    where: { id: notif.id },
    data: result.ok
      ? { status: 'SENT' as const, sent_at: new Date() }
      : { status: 'FAILED' as const, error_msg: result.error },
  });
}
