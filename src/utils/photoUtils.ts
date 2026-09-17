import type { LocalPhoto, PhotoRecord } from '@/types/photo';

import { CompletionStatus } from '@/types/photo';

export interface CompletedItem {
  space: string;
  construction: string;
  status: CompletionStatus;
}

/**
 * Groups photos by space + construction and determines completion status
 * @param photos - Array of photos to group
 * @returns Array of completed items with their status
 */
export const getCompletedItems = (photos: (LocalPhoto | PhotoRecord)[]): CompletedItem[] => {
  // Step 1: Group by space + construction
  const groupMap = new Map<string, (LocalPhoto | PhotoRecord)[]>();

  photos.forEach((photo) => {
    const space = photo.space || 'uncategorized';
    const constructions = photo.constructions || [];

    if (constructions.length === 0) {
      // Photos without construction
      const key = `${space}-uncategorized`;
      const existing = groupMap.get(key);
      if (existing) {
        existing.push(photo);
      } else {
        groupMap.set(key, [photo]);
      }
    } else {
      constructions.forEach((construction) => {
        const key = `${space}-${construction}`;
        const existing = groupMap.get(key);
        if (existing) {
          existing.push(photo);
        } else {
          groupMap.set(key, [photo]);
        }
      });
    }
  });

  // Step 2 & 3: Determine status and output
  const result: CompletedItem[] = [];

  groupMap.forEach((groupPhotos, key) => {
    const [space, construction] = key.split('-');
    const hasPending = groupPhotos.some((p) => p.status === 'pending');
    const status: CompletionStatus = hasPending
      ? CompletionStatus.PENDING
      : CompletionStatus.COMPLETED;

    result.push({
      space,
      construction,
      status,
    });
  });

  return result;
};
