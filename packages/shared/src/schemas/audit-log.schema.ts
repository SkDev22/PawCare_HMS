import { z } from 'zod';

export const AuditEntityTypeEnum = z.enum([
  'MedicalRecord',
  'SoapNote',
  'Vitals',
  'Diagnosis',
  'Prescription',
  'MedicalRecordCharge',
  'Payment',
  'StaffUser',
]);

export const AuditLogQuerySchema = z.object({
  entity_type:       AuditEntityTypeEnum.optional(),
  medical_record_id: z.string().uuid().optional(),
  date_from:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  date_to:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  cursor:            z.coerce.date().optional(),
  limit:             z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditEntityType   = z.infer<typeof AuditEntityTypeEnum>;
export type AuditLogQueryInput = z.infer<typeof AuditLogQuerySchema>;
