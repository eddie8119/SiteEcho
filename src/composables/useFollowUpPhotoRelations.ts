import type { LocalPhoto } from '@/types/photo';

import { photoApi } from '@/api/photo';
import { SyncStatus, UpdateSource } from '@/types/photo';
import {
  getAllPhotosFromIndexedDB,
  getPhotoFromIndexedDB,
  updatePhotoInIndexedDB,
} from '@/utils/indexedDB';

const uniqueIds = (ids: Array<string | null | undefined>) => [
  ...new Set(ids.filter((id): id is string => typeof id === 'string' && id.length > 0)),
];

const buildRelationPayload = (photo: LocalPhoto) => ({
  clientId: photo.id,
  parentPhotoId: photo.parentPhotoId ?? null,
  relatedPhotoIds: photo.relatedPhotoIds ?? [],
});

const syncRelationChanges = async (photoIds: string[]): Promise<boolean> => {
  const allPhotos = await getAllPhotosFromIndexedDB();
  const photosToSync = allPhotos.filter((photo) => photoIds.includes(photo.id) && photo.synced);

  if (photosToSync.length === 0) {
    return true;
  }

  const response = await photoApi.updateBatch(photosToSync.map(buildRelationPayload));
  if (!response.success || !response.data) {
    return false;
  }

  const successfulClientIds = new Set(
    response.data.results.filter((result) => result.success).map((result) => result.clientId)
  );

  for (const photo of photosToSync) {
    if (!successfulClientIds.has(photo.id)) {
      continue;
    }

    await updatePhotoInIndexedDB(photo.id, {
      syncStatus: SyncStatus.DONE,
      isDirty: false,
      updatedBy: UpdateSource.APP,
    });
  }

  return response.data.failed === 0;
};

export const addFollowUpPhoto = async (
  parentPhotoId: string,
  childPhotoId: string
): Promise<boolean> => {
  const [parentPhoto, childPhoto] = await Promise.all([
    getPhotoFromIndexedDB(parentPhotoId),
    getPhotoFromIndexedDB(childPhotoId),
  ]);

  if (!parentPhoto || !childPhoto) {
    return false;
  }

  const nextRelatedPhotoIds = uniqueIds([...(parentPhoto.relatedPhotoIds || []), childPhotoId]);

  await updatePhotoInIndexedDB(parentPhotoId, {
    relatedPhotoIds: nextRelatedPhotoIds,
    syncStatus: parentPhoto.synced ? SyncStatus.PENDING : parentPhoto.syncStatus,
    isDirty: true,
    updatedBy: UpdateSource.APP,
  });

  await updatePhotoInIndexedDB(childPhotoId, {
    parentPhotoId,
    syncStatus: childPhoto.synced ? SyncStatus.PENDING : childPhoto.syncStatus,
    isDirty: true,
    updatedBy: UpdateSource.APP,
  });

  return syncRelationChanges([parentPhotoId, childPhotoId]);
};

export const removeFollowUpPhoto = async (
  parentPhotoId: string,
  childPhotoId: string
): Promise<boolean> => {
  const [parentPhoto, childPhoto] = await Promise.all([
    getPhotoFromIndexedDB(parentPhotoId),
    getPhotoFromIndexedDB(childPhotoId),
  ]);

  if (!parentPhoto || !childPhoto) {
    return false;
  }

  const nextRelatedPhotoIds = uniqueIds(
    (parentPhoto.relatedPhotoIds || []).filter((id) => id !== childPhotoId)
  );

  await updatePhotoInIndexedDB(parentPhotoId, {
    relatedPhotoIds: nextRelatedPhotoIds,
    syncStatus: parentPhoto.synced ? SyncStatus.PENDING : parentPhoto.syncStatus,
    isDirty: true,
    updatedBy: UpdateSource.APP,
  });

  return syncRelationChanges([parentPhotoId, childPhotoId]);
};

export const useFollowUpPhotoRelations = () => {
  return {
    addFollowUpPhoto,
    removeFollowUpPhoto,
  };
};
