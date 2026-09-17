import { getAllPhotosFromIndexedDB, updatePhotoInIndexedDB } from '@/utils/indexedDB';
import { logError } from '@/utils/logger';

/**
 * Update photos to remove deleted construction option
 */
export async function clearConstructionFromPhotos(constructionName: string): Promise<void> {
  try {
    const allPhotos = await getAllPhotosFromIndexedDB();

    const photosToUpdate = allPhotos.filter((photo) =>
      photo.constructions.includes(constructionName)
    );

    const updatePromises = photosToUpdate.map((photo) =>
      updatePhotoInIndexedDB(photo.id, {
        constructions: photo.constructions.filter((c) => c !== constructionName),
      })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    logError('Error clearing construction from photos:', error, 'PhotoService');
    throw error;
  }
}

/**
 * Update photos to remove deleted space option
 */
export async function clearSpaceFromPhotos(spaceName: string): Promise<void> {
  try {
    const allPhotos = await getAllPhotosFromIndexedDB();

    const photosToUpdate = allPhotos.filter((photo) => photo.space === spaceName);

    const updatePromises = photosToUpdate.map((photo) =>
      updatePhotoInIndexedDB(photo.id, { space: null })
    );

    await Promise.all(updatePromises);
  } catch (error) {
    logError('Error clearing space from photos:', error, 'PhotoService');
    throw error;
  }
}
