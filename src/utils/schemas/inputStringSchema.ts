import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

export const inputStringSchema = (t: TranslateFunction) =>
  z.object({
    inputValue: z.string().min(1, t('validation.input_required')),
  });

export type InputStringSchema = z.infer<ReturnType<typeof inputStringSchema>>;
