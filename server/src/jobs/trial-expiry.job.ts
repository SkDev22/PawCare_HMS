import { prisma } from '../lib/prisma';
import { notifyRole } from '../modules/notifications/notifications.service';

const REMINDER_WINDOW_DAYS = 3;

// Daily check: nudges a trial clinic's admins once a day for the last few
// days before it locks. The lock itself isn't done here — it's derived live
// from `trial_ends_at` on every request (see middleware/authenticate.ts), so
// this job only ever needs to warn, never to flip a status.
export async function runTrialExpiryReminder(): Promise<void> {
  const now = new Date();
  const reminderCutoff = new Date(now.getTime() + REMINDER_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().slice(0, 10);

  const expiringSoon = await prisma.clinic.findMany({
    where: {
      is_active: true,
      plan: 'TRIAL',
      trial_ends_at: { gte: now, lte: reminderCutoff },
    },
    select: { id: true, trial_ends_at: true },
  });

  for (const clinic of expiringSoon) {
    const daysLeft = Math.ceil(
      (clinic.trial_ends_at!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
    );

    await notifyRole(prisma, clinic.id, ['ADMIN'], {
      type:         'trial_expiring',
      subject:      'Your Free Trial Is Ending Soon',
      body:         `Your PawCare HMS trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Contact us to upgrade and keep access.`,
      reference_id: `${clinic.id}:${todayStr}`,
    });
  }
}
