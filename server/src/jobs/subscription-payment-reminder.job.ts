import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { sendEmail } from '../services/sendgrid';
import { subscriptionPaymentReminderEmail } from '../lib/email-templates';
import { notifyRole } from '../modules/notifications/notifications.service';
import { getPaymentReminderStatus } from '@pawcare/shared';

// Daily check: BASIC/PRO/ENTERPRISE clinics have no auto-billing, so nothing
// else ever reminds them a manual payment is coming due. TRIAL is excluded —
// that's handled separately by the trial lockout (isTrialExpired).
export async function runSubscriptionPaymentReminder(): Promise<void> {
  const clinics = await prisma.clinic.findMany({
    where: {
      is_active:           true,
      plan:                { not: 'TRIAL' },
      next_payment_due_at: { not: null },
    },
    select: { id: true, name: true, next_payment_due_at: true },
  });
  const todayStr = new Date().toISOString().slice(0, 10);

  for (const clinic of clinics) {
    const status = getPaymentReminderStatus(clinic.next_payment_due_at?.toISOString());
    if (!status || !clinic.next_payment_due_at) continue;

    const admins = await prisma.staffUser.findMany({
      where:  { clinic_id: clinic.id, role: 'ADMIN', is_active: true, deleted_at: null },
      select: { first_name: true, email: true },
    });

    for (const admin of admins) {
      const { subject, html } = subscriptionPaymentReminderEmail({
        clinicName:     clinic.name,
        adminFirstName: admin.first_name,
        dueAt:          clinic.next_payment_due_at,
        daysUntilDue:   status.daysUntilDue,
        overdue:        status.overdue,
      });

      try {
        await sendEmail({ to: admin.email, subject, html });
      } catch (err) {
        logger.error('Failed to send subscription payment reminder email', {
          clinicId: clinic.id,
          email:    admin.email,
          err,
        });
      }
    }

    try {
      await notifyRole(prisma, clinic.id, ['ADMIN'], {
        type:    'subscription_payment_reminder',
        subject: status.overdue ? 'Subscription Payment Overdue' : 'Subscription Payment Due Soon',
        body:    status.overdue
          ? `Your subscription payment is ${Math.abs(status.daysUntilDue)} day(s) overdue.`
          : `Your subscription payment is due in ${status.daysUntilDue} day(s).`,
        reference_id: `${clinic.id}:${todayStr}`,
      });
    } catch (err) {
      logger.error('Failed to send subscription payment reminder notification', { clinicId: clinic.id, err });
    }
  }
}
