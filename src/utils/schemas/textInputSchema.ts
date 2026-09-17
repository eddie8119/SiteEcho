import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

export const textInputSchema = (t: TranslateFunction) =>
  z.object({
    value: z.string().min(1, t('validation.required')).trim(),
  });

export type TextInputSchema = z.infer<ReturnType<typeof textInputSchema>>;
