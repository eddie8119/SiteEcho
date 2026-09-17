import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

export const resendActivationSchema = (t: TranslateFunction) =>
  z.object({
    email: z.string().min(1, t('validation.email_required')).email(t('validation.email_invalid')),
  });

export type ResendActivationSchema = z.infer<ReturnType<typeof resendActivationSchema>>;
