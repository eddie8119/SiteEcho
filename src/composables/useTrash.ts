import { ref } from 'vue';

import { deletePhotoByClientId, photoApi } from '@/api/photo';
import { addFollowUpPhoto, removeFollowUpPhoto } from '@/composables/useFollowUpPhotoRelations';
import { type LocalPhoto, SyncStatus } from '@/types/photo';
import {
  deletePhotoFromIndexedDB,
  getAllPhotosFromIndexedDB,
  getTrashPhotosFromIndexedDB,
  updatePhotoInIndexedDB,
} from '@/utils/indexedDB';

const uniqueIds = (ids: string[]) => [...new Set(ids)];

export function useTrash() {
  const trashPhotos = ref<LocalPhoto[]>([]);
  const isLoadingTrash = ref(false);
  const trashError = ref<string | null>(null);
  const expiredPhotosCount = ref(0);
  const isDeleting = ref(false);

  /**
   * Load all photos from trash (isDeleted=true with trashedAt set)
   * Syncs with server to remove photos that have been permanently deleted from Web
   * @param projectId - Optional project ID to filter photos by project
   */
  const loadTrashPhotos = async (projectId?: string | null) => {
    isLoadingTrash.value = true;
    trashError.value = null;
    try {
      let photos = await getTrashPhotosFromIndexedDB();

      // Filter by project if projectId is provided
      if (projectId) {
        photos = photos.filter((photo) => photo.projectId === projectId);
      }

      trashPhotos.value = photos;

      // Sync with server: remove photos from local IndexedDB that are no longer in server trash
      try {
        const response = await photoApi.getTrashPhotos();
        if (response.success && response.data) {
          const serverTrashClientIds = new Set(response.data.map((rp) => rp.clientId));
          const localPhotosToRemove = trashPhotos.value.filter(
            (p) => p.synced && !serverTrashClientIds.has(p.id)
          );

          // Remove photos that have been permanently deleted from Web
          for (const photo of localPhotosToRemove) {
            await deletePhotoFromIndexedDB(photo.id);
          }

          // Reload trash photos after cleanup
          let reloadedPhotos = await getTrashPhotosFromIndexedDB();
          // Apply project filter again if projectId is provided
          if (projectId) {
            reloadedPhotos = reloadedPhotos.filter((photo) => photo.projectId === projectId);
          }
          trashPhotos.value = reloadedPhotos;
        }
      } catch (syncError) {
        // If sync fails, still show local photos but log the error
        console.warn('[useTrash] Failed to sync trash with server:', syncError);
      }

      // Count expired photos (older than 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      expiredPhotosCount.value = trashPhotos.value.filter(
        (p) => p.trashedAt && p.trashedAt < thirtyDaysAgo
      ).length;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      trashError.value = message;
      console.error('[useTrash] Failed to load trash photos:', error);
    } finally {
      isLoadingTrash.value = false;
    }
  };

  /**
   * Restore a photo from trash
   * Clears isDeleted and trashedAt flags, syncs to cloud
   * Also restores any follow-up photos (photos with parentPhotoId pointing to this photo)
   */
  const restorePhoto = async (photoId: string): Promise<boolean> => {
    try {
      const photo = trashPhotos.value.find((p) => p.id === photoId);
      if (!photo) {
        console.error(`[useTrash] Photo ${photoId} not found in trash`);
        return false;
      }

      // Check for follow-up photos
      const allPhotos = await getAllPhotosFromIndexedDB();
      const followUpPhotos = allPhotos.filter((p) => p.parentPhotoId === photoId);

      // Restore follow-up photos first
      for (const followUp of followUpPhotos) {
        await updatePhotoInIndexedDB(followUp.id, {
          isDeleted: false,
          trashedAt: undefined,
          syncStatus: SyncStatus.PENDING,
        });

        if (followUp.synced) {
          await photoApi.sync([
            {
              clientId: followUp.id,
              projectId: followUp.projectId,
              takenAt: followUp.takenAt.toISOString(),
              constructions: followUp.constructions,
              space: followUp.space,
              status: followUp.status,
              pendingType: followUp.pendingType,
              note: followUp.note,
              reportNote: followUp.reportNote,
              parentPhotoId: followUp.parentPhotoId,
              relatedPhotoIds: followUp.relatedPhotoIds,
              fileBase64: '',
              syncLevel: followUp.syncLevel,
              isEvidence: followUp.isEvidence,
              isSampled: followUp.isSampled,
              isReported: followUp.isReported,
              shares: followUp.shares as unknown as Record<string, unknown>[],
              deletedAt: null,
            },
          ]);
          await updatePhotoInIndexedDB(followUp.id, { syncStatus: SyncStatus.DONE });
        }

        if (followUp.parentPhotoId === photoId) {
          await addFollowUpPhoto(photoId, followUp.id);
        }
      }

      // Update local state for the parent photo
      await updatePhotoInIndexedDB(photoId, {
        isDeleted: false,
        trashedAt: undefined,
        syncStatus: SyncStatus.PENDING,
      });

      // Sync restore to cloud (clear deleted_at)
      if (photo.synced) {
        await photoApi.sync([
          {
            clientId: photo.id,
            projectId: photo.projectId,
            takenAt: photo.takenAt.toISOString(),
            constructions: photo.constructions,
            space: photo.space,
            status: photo.status,
            pendingType: photo.pendingType,
            note: photo.note,
            reportNote: photo.reportNote,
            parentPhotoId: photo.parentPhotoId,
            relatedPhotoIds: photo.relatedPhotoIds,
            fileBase64: '',
            syncLevel: photo.syncLevel,
            isEvidence: photo.isEvidence,
            isSampled: photo.isSampled,
            isReported: photo.isReported,
            shares: photo.shares as unknown as Record<string, unknown>[],
            deletedAt: null,
          },
        ]);
        await updatePhotoInIndexedDB(photoId, { syncStatus: SyncStatus.DONE });
      }

      if (photo.parentPhotoId) {
        await addFollowUpPhoto(photo.parentPhotoId, photo.id);
      }

      // Reload trash photos to update the list
      await loadTrashPhotos();
      return true;
    } catch (error) {
      console.error(`[useTrash] Failed to restore photo ${photoId}:`, error);
      return false;
    }
  };

  /**
   * Permanently delete a photo from trash
   * Also deletes any follow-up photos (photos with parentPhotoId pointing to this photo)
   * Deletes from both Supabase (if synced) and local IndexedDB
   */
  const permanentDeleteTrash = async (photo: LocalPhoto): Promise<boolean> => {
    try {
      const allPhotos = await getAllPhotosFromIndexedDB();
      const followUpPhotos = allPhotos.filter((p) => p.parentPhotoId === photo.id);

      if (photo.parentPhotoId) {
        await removeFollowUpPhoto(photo.parentPhotoId, photo.id);
      }

      // Delete follow-up photos first
      for (const followUp of followUpPhotos) {
        await removeFollowUpPhoto(photo.id, followUp.id);

        if (followUp.synced) {
          const success = await deletePhotoByClientId(followUp.id);
          if (!success) {
            console.error(
              `[useTrash] Failed to delete follow-up photo ${followUp.id} from Supabase`
            );
          }
        }
        await deletePhotoFromIndexedDB(followUp.id);
      }

      // If photo was synced to cloud, delete from Supabase first using clientId
      if (photo.synced) {
        const success = await deletePhotoByClientId(photo.id);
        if (!success) {
          console.error(`[useTrash] Failed to delete photo ${photo.id} from Supabase`);
          return false;
        }
      }

      // Delete from local IndexedDB
      await deletePhotoFromIndexedDB(photo.id);

      // Reload trash photos to update the list
      await loadTrashPhotos();
      return true;
    } catch (error) {
      console.error(`[useTrash] Failed to permanently delete photo ${photo.id}:`, error);
      return false;
    }
  };

  /**
   * Batch restore multiple photos from trash
   */
  const batchRestorePhotos = async (
    photoIds: string[]
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    for (const id of photoIds) {
      const result = await restorePhoto(id);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  };

  /**
   * Batch permanently delete multiple photos from trash
   */
  const batchPermanentDeleteTrash = async (
    photos: LocalPhoto[],
    projectId?: string | null
  ): Promise<{ success: number; failed: number }> => {
    if (photos.length === 0) {
      return { success: 0, failed: 0 };
    }

    isDeleting.value = true;

    try {
      const selectedPhotoIds = uniqueIds(photos.map((photo) => photo.id));
      const allPhotos = await getAllPhotosFromIndexedDB();
      const allPhotosById = new Map(allPhotos.map((photo) => [photo.id, photo]));
      let failedCount = 0;

      const followUpPhotos = allPhotos.filter((photo) =>
        photo.parentPhotoId ? selectedPhotoIds.includes(photo.parentPhotoId) : false
      );
      const photosToDelete = uniqueIds([
        ...selectedPhotoIds,
        ...followUpPhotos.map((photo) => photo.id),
      ]);
      const photosToDeleteSet = new Set(photosToDelete);

      const response = await photoApi.deleteBatch(selectedPhotoIds);
      if (!response.success) {
        isDeleting.value = false;
        return { success: 0, failed: photos.length };
      }

      const parentChildrenToRemove = new Map<string, Set<string>>();

      for (const photo of [...photos, ...followUpPhotos]) {
        if (!photo.parentPhotoId || photosToDeleteSet.has(photo.parentPhotoId)) {
          continue;
        }

        const currentChildren =
          parentChildrenToRemove.get(photo.parentPhotoId) || new Set<string>();
        currentChildren.add(photo.id);
        parentChildrenToRemove.set(photo.parentPhotoId, currentChildren);
      }

      for (const [parentId, childIds] of parentChildrenToRemove.entries()) {
        const parentPhoto = allPhotosById.get(parentId);
        if (!parentPhoto) {
          failedCount++;
          continue;
        }

        const nextRelatedPhotoIds = uniqueIds(
          (parentPhoto.relatedPhotoIds || []).filter((relatedId) => !childIds.has(relatedId))
        );

        try {
          await updatePhotoInIndexedDB(parentId, {
            relatedPhotoIds: nextRelatedPhotoIds,
          });
        } catch (error) {
          failedCount++;
          console.error(`[useTrash] Failed to update parent relations for ${parentId}:`, error);
        }
      }

      for (const photoId of photosToDelete) {
        try {
          await deletePhotoFromIndexedDB(photoId);
        } catch (error) {
          failedCount++;
          console.error(`[useTrash] Failed to delete photo ${photoId} from IndexedDB:`, error);
        }
      }

      await loadTrashPhotos(projectId);
      isDeleting.value = false;
      return { success: Math.max(0, selectedPhotoIds.length - failedCount), failed: failedCount };
    } catch (error) {
      console.error('[useTrash] Failed to batch permanently delete photos:', error);
      isDeleting.value = false;
      return { success: 0, failed: photos.length };
    }
  };

  /**
   * Cleanup expired photos from trash (older than 30 days)
   * Deletes from both cloud and local storage
   */
  const cleanupExpiredPhotos = async (): Promise<{ success: number; failed: number }> => {
    let successCount = 0;
    let failedCount = 0;

    try {
      // Call backend API to cleanup expired photos from cloud
      const response = await photoApi.cleanupExpiredTrash();
      if (response.success && response.data) {
        successCount = response.data.deleted;
      }

      // Cleanup expired photos from local IndexedDB
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const localExpiredPhotos = trashPhotos.value.filter(
        (p) => p.trashedAt && p.trashedAt < thirtyDaysAgo
      );

      for (const photo of localExpiredPhotos) {
        try {
          await deletePhotoFromIndexedDB(photo.id);
          successCount++;
        } catch (error) {
          console.error(`[useTrash] Failed to delete expired photo ${photo.id}:`, error);
          failedCount++;
        }
      }

      // Reload trash photos
      await loadTrashPhotos();
    } catch (error) {
      console.error('[useTrash] Failed to cleanup expired photos:', error);
      failedCount++;
    }

    return { success: successCount, failed: failedCount };
  };

  return {
    trashPhotos,
    isLoadingTrash,
    trashError,
    expiredPhotosCount,
    isDeleting,
    loadTrashPhotos,
    restorePhoto,
    permanentDeleteTrash,
    batchRestorePhotos,
    batchPermanentDeleteTrash,
    cleanupExpiredPhotos,
  };
}
