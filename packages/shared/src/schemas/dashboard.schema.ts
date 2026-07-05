import { z } from 'zod';

export const DashboardQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional(),
});

export type DashboardQuery = z.infer<typeof DashboardQuerySchema>;
