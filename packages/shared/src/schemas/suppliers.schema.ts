import { z } from 'zod';

export const SupplierQuerySchema = z.object({
  search: z.string().max(100).optional(),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
});

export type SupplierQuery = z.infer<typeof SupplierQuerySchema>;
