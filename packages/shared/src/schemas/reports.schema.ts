import { z } from 'zod';

export const ReportRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  end_date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
});

export type ReportRange = z.infer<typeof ReportRangeSchema>;

export const ReportDaysSchema = z.object({
  days: z.coerce.number().int().positive().max(365).default(30),
});

export type ReportDays = z.infer<typeof ReportDaysSchema>;
