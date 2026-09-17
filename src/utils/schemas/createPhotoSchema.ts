import { z } from 'zod';

import type { TranslateFunction } from '@/types/i18n';

import { PendingType, PhotoStatus } from '@/types/photo';

export const createPhotoSchema = (_t: TranslateFunction) =>
  z.object({
    status: z.enum([PhotoStatus.NORMAL, PhotoStatus.PENDING, PhotoStatus.RESOLVED]),
    pendingType: z.nativeEnum(PendingType).nullable(),
    constructions: z.array(z.string()).default([]),
    space: z.string().nullable(),
    note: z.string().default(''),
  });

export type CreatePhotoSchema = z.infer<ReturnType<typeof createPhotoSchema>>;
