import { z } from 'zod';

export const PosSaleItemSchema = z.object({
  item_id:  z.string().uuid(),
  quantity: z.number().int().positive(),
  batch_id: z.string().uuid().optional(),
});

export const CreatePosSaleSchema = z.object({
  owner_id: z.string().uuid().optional(),
  // Free-typed walk-in name — only meaningful when owner_id isn't set; a
  // linked owner's name always comes from the relation.
  customer_name: z.string().max(200).optional(),
  items: z.array(PosSaleItemSchema).min(1, 'Add at least one item'),
  // Same values as RecordPaymentSchema (billing.schema.ts) — one payment
  // method for the whole sale, taken in full at checkout.
  payment_method: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
  discount_amount: z.coerce.number().min(0).default(0),
  // Cash tendered by the customer — optional; omitted means "paid the exact
  // amount," no change tracked. Validated against the computed total
  // server-side (pos.service.ts), not here, since the total isn't known
  // until line items are resolved.
  amount_tendered: z.coerce.number().positive().optional(),
});

export const PosSaleQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export const PosReturnLineSchema = z.object({
  line_item_id: z.string().uuid(),
  quantity:     z.number().int().positive(),
});

export const CreatePosReturnSchema = z.object({
  lines: z.array(PosReturnLineSchema).min(1, 'Select at least one line item to return'),
  reason: z.string().max(500).optional(),
  // Same values as CreatePosSaleSchema's payment_method — this is the
  // method the refund is given back through, not necessarily the original
  // tender.
  refund_method: z.enum(['cash', 'card', 'insurance', 'bank_transfer']),
});

export type PosSaleItemInput    = z.infer<typeof PosSaleItemSchema>;
export type CreatePosSaleInput  = z.infer<typeof CreatePosSaleSchema>;
export type PosSaleQueryInput   = z.infer<typeof PosSaleQuerySchema>;
export type PosReturnLineInput  = z.infer<typeof PosReturnLineSchema>;
export type CreatePosReturnInput = z.infer<typeof CreatePosReturnSchema>;
