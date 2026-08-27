import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { isQuietHours } from '../lib/quiet-hours';
import { vaccineDueReminderEmail } from '../lib/email-templates';
import { notifyOwner } from '../modules/notifications/notifications.service';

const WINDOWS: { daysAhead: 30 | 7; label: '30d' | '7d' }[] = [
  { daysAhead: 30, label: '30d' },
  { daysAhead: 7, label: '7d' },
];

// Whole-day (UTC) bucket for the given number of days ahead — daily cadence
// is fine here since a due date carries no time-of-day meaning.
function dayRange(daysAhead: number): { start: Date; end: Date } {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  start.setUTCDate(start.getUTCDate() + daysAhead);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end };
}

export async function runVaccineDueReminders(): Promise<void> {
  const clinics = await prisma.clinic.findMany({
    where:  { is_active: true },
    select: { id: true, name: true, timezone: true },
  });

  for (const clinic of clinics) {
    if (isQuietHours(clinic.timezone)) continue;

    for (const { daysAhead, label } of WINDOWS) {
      const { start, end } = dayRange(daysAhead);

      const vaccinations = await prisma.vaccination.findMany({
        where: {
          next_due_at: { gte: start, lt: end },
          pet:         { status: 'ACTIVE', deleted_at: null, owner: { clinic_id: clinic.id } },
        },
        select: {
          id:           true,
          vaccine_name: true,
          next_due_at:  true,
          pet: {
            select: {
              name:  true,
              owner: { select: { id: true, first_name: true } },
            },
          },
        },
      });

      for (const vax of vaccinations) {
        if (!vax.next_due_at) continue;

        const { subject, html } = vaccineDueReminderEmail({
          clinicName:     clinic.name,
          ownerFirstName: vax.pet.owner.first_name,
          petName:        vax.pet.name,
          vaccineName:    vax.vaccine_name,
          dueAt:          vax.next_due_at,
          daysAhead,
        });

        try {
          await notifyOwner(prisma, {
            owner_id:     vax.pet.owner.id,
            type:         `vaccine_due_reminder_${label}`,
            subject,
            body:         html,
            reference_id: `${vax.id}:${label}`,
          });
        } catch (err) {
          logger.error('Failed to send vaccine due reminder', { vaccinationId: vax.id, err });
        }
      }
    }
  }
}
