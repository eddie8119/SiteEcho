import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { PASSWORD_RULES } from '@/constants/password';

export const createResetPasswordSchema = (t: TranslateFunction) =>
  z
    .object({
      newPassword: z
        .string()
        .min(PASSWORD_RULES.min, t('validation.password.min', { min: PASSWORD_RULES.min }))
        .regex(PASSWORD_RULES.hasUpperCase, t('validation.password.uppercase'))
        .regex(PASSWORD_RULES.hasSpecialChar, t('validation.password.special'))
        .regex(PASSWORD_RULES.hasAlphaNumeric, t('validation.password.alphanumeric')),
      newConfirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.newConfirmPassword, {
      message: t('validation.password.mismatch'),
      path: ['newConfirmPassword'],
    });

export type ResetPasswordSchema = z.infer<ReturnType<typeof createResetPasswordSchema>>;
