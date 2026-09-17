import type { PhotoWithConstructions } from '@/types/report';

/**
 * Get all unique construction names for a space's photo group
 */
export const getConstructionsForSpace = (group: {
  [photoId: string]: PhotoWithConstructions;
}): string[] => {
  const constructionsSet = new Set<string>();
  Object.values(group).forEach((item) => {
    item.constructions.forEach((c) => constructionsSet.add(c));
  });
  return Array.from(constructionsSet).sort();
};
