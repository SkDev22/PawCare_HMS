import { z } from 'zod';

export const ItemCategoryEnum = z.enum([
  'MEDICATION',
  'VACCINE',
  'SURGICAL_SUPPLY',
  'DIAGNOSTIC_SUPPLY',
  'FOOD',
  'EQUIPMENT',
  'OTHER',
]);

export const CreateInventoryItemSchema = z.object({
  name:              z.string().min(1, 'Name is required').max(200),
  sku:               z.string().max(100).optional(),
  category:          ItemCategoryEnum,
  unit:              z.string().min(1, 'Unit is required').max(50),
  reorder_threshold: z.coerce.number().int().min(0).default(10),
  supplier_name:     z.string().max(200).optional(),
  supplier_sku:      z.string().max(100).optional(),
  location:          z.string().max(200).optional(),
  is_controlled:     z.boolean().default(false),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial().extend({
  is_active: z.boolean().optional(),
});

// Full set of transaction kinds that can ever appear in the ledger. 'purchase'
// rows are only ever created internally by the GRN module (see grn.schema.ts) —
// LogTransactionTypeEnum below is the restricted subset a client may submit
// through POST /inventory/:id/transactions.
export const TransactionTypeEnum = z.enum(['purchase', 'dispensed', 'adjustment', 'expired']);

export const LogTransactionTypeEnum = z.enum(['dispensed', 'adjustment', 'expired']);

export const LogTransactionSchema = z
  .object({
    type:         LogTransactionTypeEnum,
    quantity:     z.coerce.number().int().refine((n) => n !== 0, 'Quantity cannot be zero'),
    batch_id:     z.string().uuid().optional(),
    reference_id: z.string().max(200).optional(),
    notes:        z.string().max(500).optional(),
  })
  // Adjustments and write-offs correct a specific physical batch, so a batch
  // must be picked; a plain dispense may omit it to auto-consume FIFO.
  .refine((data) => data.type === 'dispensed' || data.batch_id !== undefined, {
    message: 'A batch must be selected for this transaction type',
    path:    ['batch_id'],
  });

export const InventoryQuerySchema = z.object({
  category:   ItemCategoryEnum.optional(),
  low_stock:  z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  is_active:  z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  search:     z.string().max(100).optional(),
  cursor:     z.string().uuid().optional(),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

export type ItemCategory              = z.infer<typeof ItemCategoryEnum>;
export type CreateInventoryItemInput  = z.infer<typeof CreateInventoryItemSchema>;
export type UpdateInventoryItemInput  = z.infer<typeof UpdateInventoryItemSchema>;
export type LogTransactionInput       = z.infer<typeof LogTransactionSchema>;
export type InventoryQuery            = z.infer<typeof InventoryQuerySchema>;
