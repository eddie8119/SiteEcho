import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { PROJECT_TYPE_VALUES } from '@/constants/selection';

const constructionSelectionSchema = z.object({
  name: z.string(),
  id: z.string(),
});

export const createProjectSchema = (t: TranslateFunction) =>
  z.object({
    name: z.string().min(1, t('validation.title.required')).trim(),
    type: z.enum(PROJECT_TYPE_VALUES).optional(),
    constructionContainer: z.array(constructionSelectionSchema).optional().nullable(),
    groupReportNotes: z.record(z.string()).optional().nullable(),
  });

export type CreateProjectSchema = z.infer<ReturnType<typeof createProjectSchema>>;
