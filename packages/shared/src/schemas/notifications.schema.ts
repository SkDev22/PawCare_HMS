import { z } from 'zod';

export const NotificationQuerySchema = z.object({
  unread_only: z
    .union([z.literal('true'), z.literal('false')])
    .transform((v) => v === 'true')
    .optional(),
  cursor:      z.string().uuid().optional(),
  limit:       z.coerce.number().int().min(1).max(100).default(30),
});

export type NotificationQuery = z.infer<typeof NotificationQuerySchema>;
