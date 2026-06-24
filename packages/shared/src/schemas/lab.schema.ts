import { z } from 'zod';

// ─── Enums ────────────────────────────────────────────────────────────────────

export const LabStatusEnum = z.enum([
  'PENDING',
  'SAMPLE_COLLECTED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
]);

// ─── Lab Order Schemas ────────────────────────────────────────────────────────

export const CreateLabOrderSchema = z.object({
  pet_id:            z.string().uuid('Invalid pet ID'),
  panel_name:        z.string().min(1, 'Panel name is required').max(200),
  is_external:       z.boolean().default(false),
  external_lab_name: z.string().max(200).optional(),
  notes:             z.string().max(2000).optional(),
  medical_record_id: z.string().uuid().optional(),
});

export const UpdateLabOrderStatusSchema = z.object({
  status: LabStatusEnum,
});

export const LabOrderQuerySchema = z.object({
  pet_id:    z.string().uuid().optional(),
  status:    LabStatusEnum.optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  date_to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  cursor:    z.string().uuid().optional(),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

// ─── Lab Result Schemas ───────────────────────────────────────────────────────

export const AddLabResultSchema = z.object({
  test_name:         z.string().min(1, 'Test name is required').max(200),
  value:             z.string().min(1, 'Value is required').max(100),
  unit:              z.string().max(50).optional(),
  reference_min:     z.string().max(50).optional(),
  reference_max:     z.string().max(50).optional(),
  is_abnormal:       z.boolean().default(false),
  medical_record_id: z.string().uuid().optional(),
});

export const AddLabResultsBatchSchema = z.object({
  results: z
    .array(AddLabResultSchema)
    .min(1, 'At least one result is required')
    .max(50, 'At most 50 results per batch'),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type LabStatusType             = z.infer<typeof LabStatusEnum>;
export type CreateLabOrderInput       = z.infer<typeof CreateLabOrderSchema>;
export type UpdateLabOrderStatusInput = z.infer<typeof UpdateLabOrderStatusSchema>;
export type LabOrderQueryInput        = z.infer<typeof LabOrderQuerySchema>;
export type AddLabResultInput         = z.infer<typeof AddLabResultSchema>;
export type AddLabResultsBatchInput   = z.infer<typeof AddLabResultsBatchSchema>;
