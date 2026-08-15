import { z } from "zod";

export const SearchQuerySchema = z.object({
  q: z.string().trim().min(1, "Search query is required").max(100),
  limit: z.coerce.number().int().min(1).max(10).default(5),
});

export type SearchQueryInput = z.infer<typeof SearchQuerySchema>;
