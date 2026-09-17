import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { PASSWORD_RULES } from '@/constants/password';

export const createLoginSchema = (t: TranslateFunction) =>
  z.object({
    email: z.string().min(1, t('validation.email.required')).email(t('validation.email.invalid')),
    // Login 僅檢查最小長度，避免對既有密碼的複雜度造成限制
    password: z
      .string()
      .min(PASSWORD_RULES.min, t('validation.password.min', { min: PASSWORD_RULES.min }))
      .regex(PASSWORD_RULES.hasUpperCase, t('validation.password.uppercase'))
      .regex(PASSWORD_RULES.hasSpecialChar, t('validation.password.special'))
      .regex(PASSWORD_RULES.hasAlphaNumeric, t('validation.password.alphanumeric')),
  });

export type LoginSchema = z.infer<ReturnType<typeof createLoginSchema>>;
