import { z } from 'zod';

export const AdmitPetSchema = z.object({
  pet_id:               z.string().uuid('Valid pet ID required'),
  kennel_id:            z.string().uuid('Valid kennel ID required'),
  reason:               z.string().min(1, 'Reason is required').max(1000),
  estimated_stay_days:  z.coerce.number().int().positive().optional(),
});

export const DischargePetSchema = z.object({
  discharge_notes: z.string().max(2000).optional(),
});

export const AddCareLogSchema = z.object({
  type:  z.enum(['feeding', 'medication', 'vitals', 'observation']),
  notes: z.string().min(1, 'Notes are required').max(2000),
});

export const HospitalizationQuerySchema = z.object({
  active_only: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  pet_id:      z.string().uuid().optional(),
  cursor:      z.string().uuid().optional(),
  limit:       z.coerce.number().int().min(1).max(100).default(20),
});

export type AdmitPetInput        = z.infer<typeof AdmitPetSchema>;
export type DischargePetInput    = z.infer<typeof DischargePetSchema>;
export type AddCareLogInput      = z.infer<typeof AddCareLogSchema>;
export type HospitalizationQuery = z.infer<typeof HospitalizationQuerySchema>;
