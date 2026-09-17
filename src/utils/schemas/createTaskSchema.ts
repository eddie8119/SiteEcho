import { z } from 'zod';

import type { TranslateFunction } from '../../types/i18n';

export const createTaskSchema = (t: TranslateFunction) =>
  z.object({
    title: z.string().min(1, t('validation.title.required')),
    description: z.string().min(1, t('validation.description_required')),
    constructionType: z.string(),
    projectId: z.string(),
    status: z.enum(['todo', 'inProgress', 'done']),
    reminderDateTime: z.string().optional(),
    endDateTime: z.string().optional(),
  });

export type CreateTaskSchema = z.infer<ReturnType<typeof createTaskSchema>>;
