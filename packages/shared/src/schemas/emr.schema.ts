import { z } from 'zod';

export const CreateMedicalRecordSchema = z.object({
  pet_id: z.string().uuid('Invalid pet ID'),
  vet_id: z.string().uuid('Invalid vet ID').optional(),
  appointment_id: z.string().uuid('Invalid appointment ID').optional(),
  visit_date: z.string().optional(),
  chief_complaint: z.string().max(2000).optional(),
});

export const UpdateMedicalRecordSchema = z.object({
  chief_complaint: z.string().max(2000).optional(),
  visit_date: z.string().optional(),
});

export const MedicalRecordQuerySchema = z.object({
  search: z.string().optional(),
  pet_id: z.string().uuid().optional(),
  vet_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const UpsertSoapNoteSchema = z.object({
  subjective: z.string().max(5000).optional(),
  objective: z.string().max(5000).optional(),
  assessment: z.string().max(5000).optional(),
  plan: z.string().max(5000).optional(),
});

export const UpsertVitalsSchema = z.object({
  weight_kg: z.coerce.number().positive().optional(),
  temperature_c: z.coerce.number().positive().optional(),
  heart_rate_bpm: z.coerce.number().int().positive().optional(),
  respiratory_rate: z.coerce.number().int().positive().optional(),
  blood_pressure: z.string().max(20).optional(),
  body_condition_score: z.coerce.number().int().min(1).max(9).optional(),
});

export const CreateDiagnosisSchema = z.object({
  code: z.string().max(50).optional(),
  name: z.string().min(1, 'Diagnosis name is required').max(500),
  is_primary: z.boolean().default(false),
  notes: z.string().max(1000).optional(),
});

const PrescriptionBaseSchema = z.object({
  drug_name: z.string().min(1, 'Drug name is required').max(200),
  dosage: z.string().min(1, 'Dosage is required').max(200),
  frequency: z.string().min(1, 'Frequency is required').max(200),
  duration_days: z.coerce.number().int().positive().optional(),
  quantity: z.coerce.number().int().positive().optional(),
  refills_remaining: z.coerce.number().int().min(0).default(0),
  instructions: z.string().max(1000).optional(),
  dispensed_at: z.string().optional(),
  expires_at: z.string().optional(),
  // Set when this drug is dispensed from clinic stock — links to the inventory
  // catalog and auto-creates the matching bill + stock deduction. Omitted means
  // the owner fills it at an outside pharmacy (documentation only).
  item_id: z.string().uuid('Invalid item ID').optional(),
});

export const CreatePrescriptionSchema = PrescriptionBaseSchema.refine(
  (d) => !d.item_id || (d.quantity !== undefined && d.quantity > 0),
  { message: 'Quantity is required when dispensing from clinic stock', path: ['quantity'] },
);

export const UpdatePrescriptionSchema = PrescriptionBaseSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const CreateChargeSchema = z
  .object({
    item_id: z.string().uuid('Invalid item ID').optional(),
    service_id: z.string().uuid('Invalid service ID').optional(),
    quantity: z.coerce.number().int().positive().default(1),
    description: z.string().max(500).optional(),
  })
  .refine((d) => !!d.item_id !== !!d.service_id, {
    message: 'Provide exactly one of item_id or service_id',
    path: ['item_id'],
  });

export type CreateMedicalRecordInput = z.infer<typeof CreateMedicalRecordSchema>;
export type UpdateMedicalRecordInput = z.infer<typeof UpdateMedicalRecordSchema>;
export type MedicalRecordQueryInput = z.infer<typeof MedicalRecordQuerySchema>;
export type UpsertSoapNoteInput = z.infer<typeof UpsertSoapNoteSchema>;
export type UpsertVitalsInput = z.infer<typeof UpsertVitalsSchema>;
export type CreateDiagnosisInput = z.infer<typeof CreateDiagnosisSchema>;
export type CreatePrescriptionInput = z.infer<typeof CreatePrescriptionSchema>;
export type UpdatePrescriptionInput = z.infer<typeof UpdatePrescriptionSchema>;
export type CreateChargeInput = z.infer<typeof CreateChargeSchema>;
