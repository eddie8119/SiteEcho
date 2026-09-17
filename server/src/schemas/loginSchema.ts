import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[\w\W]{6,}$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
});

export type LoginSchema = z.infer<typeof loginSchema>;
