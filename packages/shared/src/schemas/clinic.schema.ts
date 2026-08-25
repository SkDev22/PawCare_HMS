import { z } from 'zod';

// ─── Clinic Schemas ───────────────────────────────────────────────────────────
// Only the clinic's own profile fields are editable here — plan, trial_ends_at,
// and extra_features are managed separately (see clinic:create / clinic:upgrade
// scripts), never through this staff-facing endpoint.

export const UpdateClinicSchema = z.object({
  name:                z.string().min(1, 'Clinic name is required').max(200).optional(),
  address:             z.string().max(500).optional(),
  phone:               z.string().max(30).optional(),
  email:               z.string().email('Invalid email address').optional(),
  timezone:            z.string().max(100).optional(),
  currency:            z.string().max(10).optional(),
  tax_rate:            z.coerce.number().min(0).max(100, 'Tax rate must be a percentage between 0 and 100').optional(),
  invoice_prefix:      z.string().max(20).optional(),
  invoice_due_days:    z.coerce.number().int().min(0).max(365).optional(),
  invoice_footer_text: z.string().max(1000).optional(),
});

export type UpdateClinicInput = z.infer<typeof UpdateClinicSchema>;

// ─── Business Hours Schemas ───────────────────────────────────────────────────

export const ClinicHoursEntrySchema = z
  .object({
    day_of_week: z.coerce.number().int().min(0).max(6),
    is_closed:   z.boolean().default(false),
    open_time:   z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
    close_time:  z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format').optional(),
  })
  .refine((d) => d.is_closed || (d.open_time && d.close_time), {
    message: 'open_time and close_time are required unless the day is closed',
    path: ['open_time'],
  })
  .refine((d) => d.is_closed || !d.open_time || !d.close_time || d.close_time > d.open_time, {
    message: 'Closing time must be after opening time',
    path: ['close_time'],
  });

export const UpsertClinicHoursSchema = z.object({
  entries: z
    .array(ClinicHoursEntrySchema)
    .max(7, 'At most 7 entries (one per day)')
    .refine(
      (entries) => new Set(entries.map((e) => e.day_of_week)).size === entries.length,
      { message: 'Duplicate day_of_week entries are not allowed' },
    ),
});

export type ClinicHoursEntryInput  = z.infer<typeof ClinicHoursEntrySchema>;
export type UpsertClinicHoursInput = z.infer<typeof UpsertClinicHoursSchema>;
