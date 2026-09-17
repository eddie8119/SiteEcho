import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { Role } from '@/types/role';

export const emailSchema = (t: TranslateFunction) =>
  z.object({
    email: z.string().min(1, t('validation.email.required')).email(t('validation.email.invalid')),
    role: z.enum([Role.ADMIN, Role.EDITOR, Role.VIEWER]),
  });

export type EmailSchema = z.infer<ReturnType<typeof emailSchema>>;
