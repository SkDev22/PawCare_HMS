import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const StaffRoleEnum = z.enum([
  'ADMIN',
  'VETERINARIAN',
  'NURSE',
  'RECEPTIONIST',
  'LAB_TECHNICIAN',
]);

// ─── Staff Schemas ────────────────────────────────────────────────────────────

export const CreateStaffSchema = z.object({
  email:          z.string().email('Invalid email address'),
  password:       z.string().min(8, 'Password must be at least 8 characters'),
  first_name:     z.string().min(1, 'First name is required').max(100),
  last_name:      z.string().min(1, 'Last name is required').max(100),
  role:           StaffRoleEnum,
  specialization: z.string().max(200).optional(),
  license_number: z.string().max(100).optional(),
  phone:          z.string().max(30).optional(),
});

export const UpdateStaffSchema = z.object({
  first_name:     z.string().min(1).max(100).optional(),
  last_name:      z.string().min(1).max(100).optional(),
  email:          z.string().email().optional(),
  role:           StaffRoleEnum.optional(),
  specialization: z.string().max(200).optional(),
  license_number: z.string().max(100).optional(),
  phone:          z.string().max(30).optional(),
  avatar_url:     z.string().url().max(500).optional(),
  is_active:      z.boolean().optional(),
});

export const StaffQuerySchema = z.object({
  role:      StaffRoleEnum.optional(),
  search:    z.string().max(100).optional(),
  is_active: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  cursor: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Schedule Schemas ─────────────────────────────────────────────────────────

export const ScheduleEntrySchema = z
  .object({
    day_of_week: z.coerce.number().int().min(0).max(6),
    start_time:  z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    end_time:    z.string().regex(/^\d{2}:\d{2}$/, 'Use HH:MM format'),
    is_active:   z.boolean().default(true),
  })
  .refine((d) => d.end_time > d.start_time, {
    message: 'End time must be after start time',
    path: ['end_time'],
  });

export const UpsertScheduleSchema = z.object({
  entries: z
    .array(ScheduleEntrySchema)
    .max(7, 'At most 7 schedule entries (one per day)')
    .refine(
      (entries) => new Set(entries.map((e) => e.day_of_week)).size === entries.length,
      { message: 'Duplicate day_of_week entries are not allowed' },
    ),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type StaffRoleType        = z.infer<typeof StaffRoleEnum>;
export type CreateStaffInput     = z.infer<typeof CreateStaffSchema>;
export type UpdateStaffInput     = z.infer<typeof UpdateStaffSchema>;
export type StaffQueryInput      = z.infer<typeof StaffQuerySchema>;
export type ScheduleEntryInput   = z.infer<typeof ScheduleEntrySchema>;
export type UpsertScheduleInput  = z.infer<typeof UpsertScheduleSchema>;
