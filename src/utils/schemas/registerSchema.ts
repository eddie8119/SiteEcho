import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { PASSWORD_RULES } from '@/constants/password';

export const createRegisterSchema = (t: TranslateFunction) =>
  z
    .object({
      email: z.string().min(1, t('validation.email.required')).email(t('validation.email.invalid')),
      password: z
        .string()
        .min(PASSWORD_RULES.min, t('validation.password.min', { min: PASSWORD_RULES.min }))
        .regex(PASSWORD_RULES.hasUpperCase, t('validation.password.uppercase'))
        .regex(PASSWORD_RULES.hasSpecialChar, t('validation.password.special'))
        .regex(PASSWORD_RULES.hasAlphaNumeric, t('validation.password.alphanumeric')),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('validation.password.mismatch'),
      path: ['confirmPassword'],
    });

export type RegisterSchema = z.infer<ReturnType<typeof createRegisterSchema>>;
