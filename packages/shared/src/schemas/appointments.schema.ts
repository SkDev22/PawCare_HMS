import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const AppointmentTypeEnum = z.enum([
  'WELLNESS_EXAM',
  'VACCINATION',
  'SICK_VISIT',
  'SURGERY',
  'DENTAL',
  'FOLLOW_UP',
  'EMERGENCY',
  'GROOMING',
  'LAB_ONLY',
]);

export const AppointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'CHECKED_IN',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

// ─── Appointment Schemas ──────────────────────────────────────────────────────

export const CreateAppointmentSchema = z
  .object({
    pet_id:     z.string().uuid('Invalid pet ID'),
    vet_id:     z.string().uuid('Invalid vet ID'),
    room_id:    z.string().uuid('Invalid room ID').optional(),
    type:       AppointmentTypeEnum,
    start_at:   z.string().min(1, 'Start time is required'),
    end_at:     z.string().min(1, 'End time is required'),
    reason:     z.string().max(1000).optional(),
    notes:      z.string().max(2000).optional(),
    is_walk_in: z.boolean().default(false),
  })
  .refine((d) => new Date(d.end_at) > new Date(d.start_at), {
    message: 'End time must be after start time',
    path: ['end_at'],
  });

export const UpdateAppointmentSchema = z.object({
  vet_id:     z.string().uuid().optional(),
  room_id:    z.string().uuid().optional(),
  type:       AppointmentTypeEnum.optional(),
  start_at:   z.string().optional(),
  end_at:     z.string().optional(),
  reason:     z.string().max(1000).optional(),
  notes:      z.string().max(2000).optional(),
  is_walk_in: z.boolean().optional(),
});

export const UpdateAppointmentStatusSchema = z
  .object({
    status:        AppointmentStatusEnum,
    cancel_reason: z.string().max(500).optional(),
  })
  .refine(
    (d) => d.status !== 'CANCELLED' || !!d.cancel_reason,
    { message: 'Cancellation reason is required', path: ['cancel_reason'] },
  );

export const AppointmentQuerySchema = z.object({
  date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  status:  AppointmentStatusEnum.optional(),
  vet_id:  z.string().uuid().optional(),
  pet_id:  z.string().uuid().optional(),
  cursor:  z.string().uuid().optional(),
  limit:   z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Room Schemas ─────────────────────────────────────────────────────────────

export const CreateRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(100),
  type: z.string().min(1, 'Room type is required').max(100),
});

export const UpdateRoomSchema = CreateRoomSchema.partial();

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppointmentTypeValue         = z.infer<typeof AppointmentTypeEnum>;
export type AppointmentStatusValue       = z.infer<typeof AppointmentStatusEnum>;
export type CreateAppointmentInput       = z.infer<typeof CreateAppointmentSchema>;
export type UpdateAppointmentInput       = z.infer<typeof UpdateAppointmentSchema>;
export type UpdateAppointmentStatusInput = z.infer<typeof UpdateAppointmentStatusSchema>;
export type AppointmentQueryInput        = z.infer<typeof AppointmentQuerySchema>;
export type CreateRoomInput              = z.infer<typeof CreateRoomSchema>;
export type UpdateRoomInput              = z.infer<typeof UpdateRoomSchema>;
