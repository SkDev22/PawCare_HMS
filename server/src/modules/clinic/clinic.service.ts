import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { clinicHasFeature } from '@pawcare/shared';
import type { UpdateClinicInput, UpsertClinicHoursInput, ClinicPlanType } from '@pawcare/shared';

const CLINIC_FIELDS = {
  id:                  true,
  name:                true,
  address:             true,
  phone:               true,
  email:               true,
  logo_url:            true,
  timezone:            true,
  currency:            true,
  theme_color:         true,
  plan:                true,
  trial_ends_at:       true,
  tax_rate:            true,
  invoice_prefix:      true,
  invoice_due_days:    true,
  invoice_footer_text: true,
  created_at:          true,
  updated_at:          true,
} as const;

export async function getClinic(clinicId: string) {
  const clinic = await prisma.clinic.findUnique({
    where: { id: clinicId },
    select: CLINIC_FIELDS,
  });
  if (!clinic) throw new AppError('NOT_FOUND', 'Clinic not found', 404);
  return clinic;
}

export async function updateClinic(
  clinicId: string,
  data: UpdateClinicInput,
  plan: ClinicPlanType,
  extraFeatures: readonly string[],
) {
  if (data.theme_color !== undefined && !clinicHasFeature(plan, 'THEME_CUSTOMIZATION', extraFeatures)) {
    throw new AppError('FEATURE_NOT_ENABLED', 'Theme customization is not included in your plan', 403);
  }

  return prisma.clinic.update({
    where: { id: clinicId },
    data: {
      ...(data.name                !== undefined ? { name:                data.name }                : {}),
      ...(data.address             !== undefined ? { address:             data.address }             : {}),
      ...(data.phone               !== undefined ? { phone:               data.phone }               : {}),
      ...(data.email               !== undefined ? { email:               data.email }               : {}),
      ...(data.timezone            !== undefined ? { timezone:            data.timezone }            : {}),
      ...(data.currency            !== undefined ? { currency:            data.currency }            : {}),
      ...(data.theme_color         !== undefined ? { theme_color:         data.theme_color }         : {}),
      ...(data.tax_rate            !== undefined ? { tax_rate:            data.tax_rate }            : {}),
      ...(data.invoice_prefix      !== undefined ? { invoice_prefix:      data.invoice_prefix }      : {}),
      ...(data.invoice_due_days    !== undefined ? { invoice_due_days:    data.invoice_due_days }    : {}),
      ...(data.invoice_footer_text !== undefined ? { invoice_footer_text: data.invoice_footer_text } : {}),
    },
    select: CLINIC_FIELDS,
  });
}

// ── Business Hours ────────────────────────────────────────────────────────────

export async function getClinicHours(clinicId: string) {
  return prisma.clinicHours.findMany({
    where:   { clinic_id: clinicId },
    orderBy: { day_of_week: 'asc' },
    select: {
      id:          true,
      day_of_week: true,
      open_time:   true,
      close_time:  true,
      is_closed:   true,
    },
  });
}

export async function upsertClinicHours(clinicId: string, data: UpsertClinicHoursInput) {
  return prisma.$transaction(async (tx) => {
    await tx.clinicHours.deleteMany({ where: { clinic_id: clinicId } });

    if (data.entries.length === 0) return [];

    await tx.clinicHours.createMany({
      data: data.entries.map((e) => ({
        clinic_id:   clinicId,
        day_of_week: e.day_of_week,
        is_closed:   e.is_closed,
        open_time:   e.is_closed ? null : (e.open_time ?? null),
        close_time:  e.is_closed ? null : (e.close_time ?? null),
      })),
    });

    return tx.clinicHours.findMany({
      where:   { clinic_id: clinicId },
      orderBy: { day_of_week: 'asc' },
      select: {
        id:          true,
        day_of_week: true,
        open_time:   true,
        close_time:  true,
        is_closed:   true,
      },
    });
  });
}
