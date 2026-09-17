import { ref } from 'vue';

import type { PhotoRecord } from '@/types/photo';

import { photoApi } from '@/api/photo';
import { PendingType, PhotoStatus, SyncStatus, UpdateSource } from '@/types/photo';

export function useWebTrash() {
  const trashPhotos = ref<PhotoRecord[]>([]);
  const isLoadingTrash = ref(false);
  const trashError = ref<string | null>(null);
  const isDeleting = ref(false);

  const RETENTION_DAYS = 30;

  /**
   * Load all photos from trash (deleted_at IS NOT NULL)
   */
  const loadTrashPhotos = async () => {
    isLoadingTrash.value = true;
    trashError.value = null;
    try {
      const response = await photoApi.getTrashPhotos();
      if (response.success && response.data) {
        trashPhotos.value = response.data.map((rp) => {
          let pendingTypeValue: PendingType | null = null;
          if (rp.pendingType === 'none') pendingTypeValue = null;
          else if (rp.pendingType === 'issue') pendingTypeValue = PendingType.ISSUE;
          else if (rp.pendingType === 'fix') pendingTypeValue = PendingType.FIX;
          else if (rp.pendingType === 'check') pendingTypeValue = PendingType.CHECK;

          return {
            id: rp.clientId, // Use clientId as primary ID for sync with mobile
            clientId: rp.clientId,
            serverId: rp.id,
            projectId: rp.projectId || '',
            imageUrl: rp.url || '',
            thumbnailUrl: rp.thumbnailUrl || undefined,
            takenAt: new Date(rp.takenAt),
            createdAt: new Date(rp.createdAt),
            updatedAt: new Date(rp.updatedAt),
            constructions: rp.constructions,
            space: rp.space,
            status: rp.status === 'normal' ? PhotoStatus.NORMAL : PhotoStatus.PENDING,
            pendingType: pendingTypeValue,
            note: rp.note || '',
            synced: true,
            syncStatus: SyncStatus.DONE,
            isDeleted: true,
            updatedBy: (rp.updatedBy === 'web'
              ? UpdateSource.WEB
              : UpdateSource.APP) as UpdateSource,
            syncLevel: rp.isEvidence ? 'evidence' : 'thumbnail',
            isEvidence: rp.isEvidence,
            isSampled: !rp.isEvidence,
            isReported: false,
            shares: [],
            userId: rp.userId,
            trashedAt: rp.deletedAt ? new Date(rp.deletedAt) : undefined,
            deletedAt: rp.deletedAt ? new Date(rp.deletedAt) : null,
          } as PhotoRecord;
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      trashError.value = message;
      console.error('[useWebTrash] Failed to load trash photos:', error);
    } finally {
      isLoadingTrash.value = false;
    }
  };

  /**
   * Restore photos from trash
   */
  const restorePhotos = async (
    photoIds: string[]
  ): Promise<{ success: number; failed: number }> => {
    let success = 0;
    let failed = 0;

    try {
      const response = await photoApi.restoreBatch(photoIds);
      if (response.success) {
        success = photoIds.length;
        // Reload trash photos to update the list
        await loadTrashPhotos();
      } else {
        failed = photoIds.length;
      }
    } catch (error) {
      console.error('[useWebTrash] Failed to restore photos:', error);
      failed = photoIds.length;
    }

    return { success, failed };
  };

  /**
   * Permanently delete photos from trash
   */
  const permanentDeletePhotos = async (
    photos: PhotoRecord[]
  ): Promise<{ success: number; failed: number }> => {
    if (photos.length === 0) {
      return { success: 0, failed: 0 };
    }

    isDeleting.value = true;

    try {
      const clientIds = [...new Set(photos.map((photo) => photo.clientId || photo.id))];
      const response = await photoApi.deleteBatch(clientIds);

      if (!response.success) {
        isDeleting.value = false;
        return { success: 0, failed: photos.length };
      }

      await loadTrashPhotos();
      isDeleting.value = false;
      return { success: photos.length, failed: 0 };
    } catch (error) {
      console.error('[useWebTrash] Failed to permanently delete photos:', error);
      isDeleting.value = false;
      return { success: 0, failed: photos.length };
    }
  };

  /**
   * Get remaining days before permanent deletion
   */
  const getRemainingDays = (deletedAt?: Date | null): string => {
    if (!deletedAt) return '30';
    const deletedTime = new Date(deletedAt).getTime();
    const now = Date.now();
    const daysSinceDeleted = Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24));
    const remainingDays = RETENTION_DAYS - daysSinceDeleted;
    return remainingDays > 0 ? remainingDays.toString() : '0';
  };

  /**
   * Empty all trash (permanently delete all photos in trash)
   */
  const emptyTrash = async (): Promise<{ success: number; failed: number }> => {
    if (trashPhotos.value.length === 0) {
      return { success: 0, failed: 0 };
    }
    return permanentDeletePhotos(trashPhotos.value);
  };

  return {
    trashPhotos,
    isLoadingTrash,
    trashError,
    isDeleting,
    loadTrashPhotos,
    restorePhotos,
    permanentDeletePhotos,
    getRemainingDays,
    emptyTrash,
  };
}
