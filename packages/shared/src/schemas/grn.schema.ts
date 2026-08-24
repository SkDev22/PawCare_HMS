import { z } from 'zod';

export const GrnLineItemSchema = z.object({
  item_id:          z.string().uuid(),
  batch_no:         z.string().max(100).optional(),
  quantity:         z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  unit_cost:        z.coerce.number().min(0, 'Unit cost must be non-negative'),
  selling_price:    z.coerce.number().min(0, 'Selling price must be non-negative'),
  discount_percent: z.coerce.number().min(0).max(100).default(0),
  expiry_date:      z.string().optional(),
});

export const CreateGrnSchema = z.object({
  supplier_id:         z.string().uuid().optional(),
  supplier_name:       z.string().min(1, 'Supplier is required').max(200),
  supplier_invoice_no: z.string().max(100).optional(),
  notes:               z.string().max(500).optional(),
  items:               z.array(GrnLineItemSchema).min(1, 'At least one line item is required'),
});

export const GrnQuerySchema = z.object({
  search: z.string().max(100).optional(),
  cursor: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export type GrnLineItemInput = z.infer<typeof GrnLineItemSchema>;
export type CreateGrnInput   = z.infer<typeof CreateGrnSchema>;
export type GrnQuery         = z.infer<typeof GrnQuerySchema>;
