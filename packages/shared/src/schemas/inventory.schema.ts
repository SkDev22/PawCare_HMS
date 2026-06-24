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
  unit_cost:         z.coerce.number().min(0, 'Unit cost must be non-negative'),
  selling_price:     z.coerce.number().min(0).optional(),
  supplier_name:     z.string().max(200).optional(),
  supplier_sku:      z.string().max(100).optional(),
  expiry_date:       z.string().optional(),
  location:          z.string().max(200).optional(),
  is_controlled:     z.boolean().default(false),
});

export const UpdateInventoryItemSchema = CreateInventoryItemSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export const TransactionTypeEnum = z.enum(['purchase', 'dispensed', 'adjustment', 'expired']);

export const LogTransactionSchema = z.object({
  type:         TransactionTypeEnum,
  quantity:     z.coerce.number().int().refine((n) => n !== 0, 'Quantity cannot be zero'),
  reference_id: z.string().max(200).optional(),
  notes:        z.string().max(500).optional(),
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
