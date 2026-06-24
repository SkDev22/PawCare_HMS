import { z } from 'zod';

export const InvoiceStatusEnum = z.enum([
  'DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED',
]);

export const CreateInvoiceSchema = z.object({
  owner_id:        z.string().uuid('Invalid owner ID'),
  appointment_id:  z.string().uuid('Invalid appointment ID').optional(),
  due_date:        z.string().optional(),
  notes:           z.string().max(1000).optional(),
  tax_amount:      z.coerce.number().min(0).default(0),
  discount_amount: z.coerce.number().min(0).default(0),
});

export const UpdateInvoiceSchema = z.object({
  due_date:        z.string().optional(),
  notes:           z.string().max(1000).optional(),
  tax_amount:      z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
});

export const InvoiceQuerySchema = z.object({
  status:    InvoiceStatusEnum.optional(),
  owner_id:  z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  date_to:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  cursor:    z.string().uuid().optional(),
  limit:     z.coerce.number().int().min(1).max(100).default(20),
});

export const AddLineItemSchema = z.object({
  service_id:  z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  quantity:    z.coerce.number().int().positive().default(1),
  unit_price:  z.coerce.number().min(0, 'Price must be non-negative'),
});

export const RecordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  notes:  z.string().max(500).optional(),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

export const CreateServiceSchema = z.object({
  name:             z.string().min(1, 'Service name is required').max(200),
  category:         z.enum(['exam', 'procedure', 'lab', 'medication', 'grooming', 'other']),
  price:            z.coerce.number().min(0),
  duration_minutes: z.coerce.number().int().positive().optional(),
  is_taxable:       z.boolean().default(true),
});

export type CreateInvoiceInput      = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput      = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceQueryInput       = z.infer<typeof InvoiceQuerySchema>;
export type AddLineItemInput        = z.infer<typeof AddLineItemSchema>;
export type RecordPaymentInput      = z.infer<typeof RecordPaymentSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof UpdateInvoiceStatusSchema>;
export type CreateServiceInput      = z.infer<typeof CreateServiceSchema>;
export type InvoiceStatusType       = z.infer<typeof InvoiceStatusEnum>;
