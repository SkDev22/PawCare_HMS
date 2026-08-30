import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { isQuietHours } from '../lib/quiet-hours';
import { appointmentReminderEmail } from '../lib/email-templates';
import { notifyOwner } from '../modules/notifications/notifications.service';

// Runs hourly (see worker.ts) — each window is 1 hour wide so a sliding
// hourly cron catches every appointment exactly once as it crosses the
// threshold; notifyOwner's reference_id dedup covers any edge overlap.
const WINDOWS: { hoursAhead: 48 | 2; label: '48h' | '2h' }[] = [
  { hoursAhead: 48, label: '48h' },
  { hoursAhead: 2, label: '2h' },
];

export async function runAppointmentReminders(): Promise<void> {
  const clinics = await prisma.clinic.findMany({
    where:  { is_active: true },
    select: { id: true, name: true, timezone: true },
  });

  for (const clinic of clinics) {
    if (isQuietHours(clinic.timezone)) continue;

    for (const { hoursAhead, label } of WINDOWS) {
      const windowStart = new Date(Date.now() + hoursAhead * 60 * 60 * 1000);
      const windowEnd = new Date(windowStart.getTime() + 60 * 60 * 1000);

      const appointments = await prisma.appointment.findMany({
        where: {
          clinic_id: clinic.id,
          status:    { in: ['SCHEDULED', 'CONFIRMED'] },
          start_at:  { gte: windowStart, lt: windowEnd },
          pet:       { deleted_at: null },
        },
        select: {
          id:       true,
          start_at: true,
          pet: {
            select: {
              name:  true,
              owner: { select: { id: true, first_name: true } },
            },
          },
        },
      });

      for (const appt of appointments) {
        const { subject, html } = appointmentReminderEmail({
          clinicName:     clinic.name,
          ownerFirstName: appt.pet.owner.first_name,
          petName:        appt.pet.name,
          startAt:        appt.start_at,
          hoursAhead,
        });

        try {
          await notifyOwner(prisma, {
            owner_id:     appt.pet.owner.id,
            clinic_id:    clinic.id,
            type:         `appointment_reminder_${label}`,
            subject,
            body:         html,
            reference_id: `${appt.id}:${label}`,
          });
        } catch (err) {
          logger.error('Failed to send appointment reminder', { appointmentId: appt.id, err });
        }
      }
    }
  }
}
