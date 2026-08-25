import { z } from 'zod';

export const InvoiceStatusEnum = z.enum([
  'DRAFT', 'SENT', 'PAID', 'PARTIALLY_PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED',
]);

export const CreateInvoiceSchema = z.object({
  owner_id: z.string().uuid('Invalid owner ID'),
  appointment_id: z.string().uuid('Invalid appointment ID').optional(),
  due_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
  // Omit to let the clinic's tax_rate auto-apply as line items are added
  // (Invoice.tax_auto) — pass a value to set it manually from the start.
  tax_amount: z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).default(0),
});

export const UpdateInvoiceSchema = z.object({
  due_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
  tax_amount: z.coerce.number().min(0).optional(),
  discount_amount: z.coerce.number().min(0).optional(),
});

export const InvoiceQuerySchema = z.object({
  status: InvoiceStatusEnum.optional(),
  owner_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const AddLineItemSchema = z.object({
  service_id: z.string().uuid().optional(),
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.coerce.number().int().positive().default(1),
  unit_price: z.coerce.number().min(0, 'Price must be non-negative'),
});

export const RecordPaymentSchema = z.object({
  amount: z.coerce.number().positive('Amount must be positive'),
  method: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  notes: z.string().max(500).optional(),
});

export const UpdateInvoiceStatusSchema = z.object({
  status: InvoiceStatusEnum,
});

export const VoidPaymentSchema = z.object({
  reason: z.string().min(3, 'A reason is required to void a payment').max(500),
});

export const ServiceCategoryEnum = z.enum(['exam', 'procedure', 'lab', 'medication', 'grooming', 'other']);

export const CreateServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(200),
  category: ServiceCategoryEnum,
  price: z.coerce.number().min(0),
  duration_minutes: z.coerce.number().int().positive().optional(),
  is_taxable: z.boolean().default(true),
});

export const UpdateServiceSchema = z.object({
  name: z.string().min(1, 'Service name is required').max(200).optional(),
  category: ServiceCategoryEnum.optional(),
  price: z.coerce.number().min(0).optional(),
  duration_minutes: z.coerce.number().int().positive().optional(),
  is_taxable: z.boolean().optional(),
  is_active: z.boolean().optional(),
});

export const ServiceQuerySchema = z.object({
  include_inactive: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
});

export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
export type UpdateInvoiceInput = z.infer<typeof UpdateInvoiceSchema>;
export type InvoiceQueryInput = z.infer<typeof InvoiceQuerySchema>;
export type AddLineItemInput = z.infer<typeof AddLineItemSchema>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof UpdateInvoiceStatusSchema>;
export type VoidPaymentInput = z.infer<typeof VoidPaymentSchema>;
export type CreateServiceInput = z.infer<typeof CreateServiceSchema>;
export type UpdateServiceInput = z.infer<typeof UpdateServiceSchema>;
export type ServiceQueryInput = z.infer<typeof ServiceQuerySchema>;
export type InvoiceStatusType = z.infer<typeof InvoiceStatusEnum>;
