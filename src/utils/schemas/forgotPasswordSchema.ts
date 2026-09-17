import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

export const forgotPasswordSchema = (t: TranslateFunction) =>
  z.object({
    email: z.string().min(1, t('validation.email.required')).email(t('validation.email.invalid')),
  });

export type ForgotPasswordSchema = z.infer<ReturnType<typeof forgotPasswordSchema>>;
