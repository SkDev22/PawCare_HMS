import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const RefreshSchema = z.object({
  // Body is empty — refresh token comes from HttpOnly cookie
});

export type RefreshInput = z.infer<typeof RefreshSchema>;
