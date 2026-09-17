import { ref } from 'vue';

import { photoApi } from '@/api/photo';
import { useAuthStore } from '@/stores/useAuthStore';
import { PhotoSyncLevel, SyncStatus } from '@/types/photo';
import { getAllPhotosFromIndexedDB, updatePhotoInIndexedDB } from '@/utils/indexedDB';

const PENDING_SYNC_STORAGE_KEY = 'SiteNear:pending-photo-sync';
const dirtyPhotoIds = ref<Set<string>>(new Set());
const deletePhotoIds = ref<Set<string>>(new Set());
const softDeletePhotoIds = ref<Set<string>>(new Set());
const isSyncing = ref(false);
const isSyncScheduled = ref(false);
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let pendingQueueLoaded = false;
let pageHideListenerAttached = false;

const persistPendingQueue = () => {
  if (typeof window === 'undefined') return;

  window.localStorage.setItem(
    PENDING_SYNC_STORAGE_KEY,
    JSON.stringify({
      updates: Array.from(dirtyPhotoIds.value),
      deletes: Array.from(deletePhotoIds.value),
      softDeletes: Array.from(softDeletePhotoIds.value),
    })
  );
};

const loadPendingQueue = () => {
  if (pendingQueueLoaded || typeof window === 'undefined') return;
  pendingQueueLoaded = true;

  try {
    const stored = JSON.parse(window.localStorage.getItem(PENDING_SYNC_STORAGE_KEY) || '{}') as {
      updates?: string[];
      deletes?: string[];
      softDeletes?: string[];
    };
    dirtyPhotoIds.value = new Set(stored.updates || []);
    deletePhotoIds.value = new Set(stored.deletes || []);
    softDeletePhotoIds.value = new Set(stored.softDeletes || []);
  } catch {
    window.localStorage.removeItem(PENDING_SYNC_STORAGE_KEY);
  }
};

/**
 * Debounced photo sync composable
 * Collects photo edits and deletes, syncs them after a delay to avoid frequent requests
 */
export function useDebouncedPhotoSync() {
  const SYNC_DELAY = 6000; // 6 seconds delay for batch operations
  const authStore = useAuthStore();
  loadPendingQueue();

  /**
   * Check if a photo needs sync (Layer 2 or Layer 3)
   */
  const needsSync = (syncLevel: string, isEvidence: boolean): boolean => {
    return (
      syncLevel === PhotoSyncLevel.THUMBNAIL || syncLevel === PhotoSyncLevel.EVIDENCE || isEvidence
    );
  };

  /**
   * Mark a photo as dirty and trigger debounced sync
   * @param photoId The photo ID that was edited
   * @param syncLevel The photo's sync level
   * @param isEvidence Whether the photo is evidence
   */
  const triggerSync = async (photoId: string, syncLevel: string, isEvidence: boolean) => {
    // Only sync Layer 2 and Layer 3 photos
    if (!needsSync(syncLevel, isEvidence)) {
      return;
    }

    // Add to the shared, persistent queue so navigation cannot lose this change.
    dirtyPhotoIds.value.add(photoId);
    persistPendingQueue();
    isSyncScheduled.value = true;
    dispatchSyncStatus();

    // Clear existing timer
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    // Set new timer
    syncTimer = setTimeout(async () => {
      await executeSync();
    }, SYNC_DELAY);
  };

  /**
   * Mark a photo for deletion and trigger debounced sync
   * @param photoId The photo ID to delete
   * @param syncLevel The photo's sync level
   * @param isEvidence Whether the photo is evidence
   */
  const triggerDelete = async (photoId: string, syncLevel: string, isEvidence: boolean) => {
    // Only delete Layer 2 and Layer 3 photos from cloud
    if (!needsSync(syncLevel, isEvidence)) {
      return;
    }

    // Add to the shared, persistent queue so navigation cannot lose this change.
    deletePhotoIds.value.add(photoId);
    persistPendingQueue();
    isSyncScheduled.value = true;
    dispatchSyncStatus();

    // Clear existing timer
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    // Set new timer
    syncTimer = setTimeout(async () => {
      await executeSync();
    }, SYNC_DELAY);
  };

  /**
   * Mark a photo for soft delete (trash) and trigger debounced sync
   * Uses soft delete with deleted_at for 30-day recovery
   * @param photoId The photo ID to soft delete
   * @param syncLevel The photo's sync level
   * @param isEvidence Whether the photo is evidence
   */
  const triggerSoftDelete = async (photoId: string, syncLevel: string, isEvidence: boolean) => {
    // Only delete Layer 2 and Layer 3 photos from cloud
    if (!needsSync(syncLevel, isEvidence)) {
      return;
    }

    // Add to the shared, persistent queue so navigation cannot lose this change.
    softDeletePhotoIds.value.add(photoId);
    persistPendingQueue();
    isSyncScheduled.value = true;
    dispatchSyncStatus();

    // Clear existing timer
    if (syncTimer) {
      clearTimeout(syncTimer);
    }

    // Set new timer
    syncTimer = setTimeout(async () => {
      await executeSync();
    }, SYNC_DELAY);
  };

  const dispatchSyncStatus = () => {
    if (typeof window === 'undefined') return;

    window.dispatchEvent(
      new CustomEvent('photo-sync-status-changed', {
        detail: {
          pendingCount:
            dirtyPhotoIds.value.size + deletePhotoIds.value.size + softDeletePhotoIds.value.size,
          isSyncing: isSyncing.value,
          isScheduled: isSyncScheduled.value,
        },
      })
    );
  };

  /**
   * Execute sync for both updates and deletes
   */
  const executeSync = async () => {
    // Skip if already syncing to avoid duplicate concurrent syncs.
    if (isSyncing.value) return;

    // Keep the queue when authentication is temporarily unavailable.
    if (!authStore.isAuthenticated) return;

    const updates = Array.from(dirtyPhotoIds.value);
    const deletes = Array.from(deletePhotoIds.value);
    const softDeletes = Array.from(softDeletePhotoIds.value);
    if (updates.length === 0 && deletes.length === 0 && softDeletes.length === 0) return;

    isSyncScheduled.value = false;
    isSyncing.value = true;
    dispatchSyncStatus();

    dirtyPhotoIds.value.clear();
    deletePhotoIds.value.clear();
    softDeletePhotoIds.value.clear();
    persistPendingQueue();

    if (updates.length > 0) {
      try {
        await batchPushDirtyPhotos(updates);
      } catch (error) {
        dirtyPhotoIds.value = new Set([...dirtyPhotoIds.value, ...updates]);
        console.error('[useDebouncedPhotoSync] Sync failed:', error);
      }
    }

    if (deletes.length > 0) {
      try {
        await batchDeletePhotos(deletes);
      } catch (error) {
        deletePhotoIds.value = new Set([...deletePhotoIds.value, ...deletes]);
        console.error('[useDebouncedPhotoSync] Delete failed:', error);
      }
    }

    if (softDeletes.length > 0) {
      try {
        await batchSoftDeletePhotos(softDeletes);
      } catch (error) {
        softDeletePhotoIds.value = new Set([...softDeletePhotoIds.value, ...softDeletes]);
        console.error('[useDebouncedPhotoSync] Soft delete failed:', error);
      }
    }

    persistPendingQueue();
    isSyncing.value = false;

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('photo-sync-completed'));
    }

    syncTimer = null;
    dispatchSyncStatus();
  };

  /**
   * Batch push dirty photos to cloud
   * - New photos (synced: false) use photoApi.sync with fileBase64 to upload
   * - Existing photos (synced: true) use photoApi.updateBatch for metadata-only updates
   */
  const batchPushDirtyPhotos = async (photoIds: string[]) => {
    const photos = await getAllPhotosFromIndexedDB();
    const dirtyPhotos = photos.filter(
      (p) => photoIds.includes(p.id) && p.isDirty && needsSync(p.syncLevel, p.isEvidence)
    );

    if (dirtyPhotos.length === 0) {
      return;
    }

    // Split into new photos (need upload) and existing photos (need metadata update)
    const newPhotos = dirtyPhotos.filter((p) => !p.synced);
    const existingPhotos = dirtyPhotos.filter((p) => p.synced);

    // Upload new photos with fileBase64
    if (newPhotos.length > 0) {
      const blobToBase64 = (blob: Blob): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const commaIdx = result.indexOf(',');
            resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        });
      };

      const syncPayload = await Promise.all(
        newPhotos.map(async (p) => ({
          clientId: p.id,
          projectId: p.projectId,
          takenAt: p.takenAt.toISOString(),
          constructions: p.constructions,
          space: p.space,
          status: p.status,
          pendingType: p.pendingType,
          note: p.note,
          reportNote: p.reportNote,
          parentPhotoId: p.parentPhotoId,
          relatedPhotoIds: p.relatedPhotoIds,
          fileBase64: await blobToBase64(p.file),
          mimeType: p.file.type || 'image/jpeg',
          syncLevel: p.syncLevel,
          isEvidence: p.isEvidence,
          isSampled: p.isSampled,
          isReported: p.isReported,
          shares: p.shares as unknown as Record<string, unknown>[],
        }))
      );

      const syncResponse = await photoApi.sync(syncPayload);
      if (!syncResponse.success) {
        throw new Error('Photo upload sync failed');
      }

      if (syncResponse.success && syncResponse.data) {
        for (const result of syncResponse.data.results) {
          const clientId = result.clientId || (result as { client_id?: string }).client_id;
          if (result.success && clientId) {
            await updatePhotoInIndexedDB(clientId, {
              isDirty: false,
              syncStatus: SyncStatus.DONE,
              synced: true,
            });
          }
        }
      }
    }

    // Update metadata for existing photos
    if (existingPhotos.length > 0) {
      const updatePayload = existingPhotos.map((p) => ({
        clientId: p.id,
        note: p.note,
        reportNote: p.reportNote,
        space: p.space || undefined,
        status: p.status,
        pendingType: p.pendingType,
        constructions: p.constructions,
        parentPhotoId: p.parentPhotoId,
        relatedPhotoIds: p.relatedPhotoIds,
        syncLevel: p.syncLevel,
        isEvidence: p.isEvidence,
      }));

      const updateResponse = await photoApi.updateBatch(updatePayload);
      if (!updateResponse.success) {
        throw new Error('Photo metadata sync failed');
      }

      if (updateResponse.success && updateResponse.data) {
        for (const result of updateResponse.data.results) {
          const clientId =
            result.clientId ||
            (result as { client_id?: string }).client_id ||
            (result.data && result.data.clientId);
          if (result.success && clientId) {
            await updatePhotoInIndexedDB(clientId, {
              isDirty: false,
              syncStatus: SyncStatus.DONE,
              synced: true,
            });
          } else if (result.success && !clientId) {
            console.warn('[batchPushDirtyPhotos] Skipping update: clientId is undefined', result);
          }
        }
      }
    }
  };

  /**
   * Batch delete photos from cloud (hard delete)
   * Uses photoApi.deleteBatch for permanent deletion
   */
  const batchDeletePhotos = async (photoIds: string[]) => {
    if (photoIds.length === 0) {
      return;
    }

    const response = await photoApi.deleteBatch(photoIds);
    if (!response.success) {
      throw new Error('Photo deletion sync failed');
    }

    if (response.success) {
      // Photos are already marked as deleted locally, no need to update
    }
  };

  /**
   * Batch soft delete photos from cloud (trash)
   * Uses photoApi.sync with deletedAt to mark photos as deleted in cloud
   * Photos will be permanently deleted after 30 days by cleanup job
   */
  const batchSoftDeletePhotos = async (photoIds: string[]) => {
    if (photoIds.length === 0) {
      return;
    }

    const photos = await getAllPhotosFromIndexedDB();
    const photosToDelete = photos.filter((p) => photoIds.includes(p.id) && p.synced);

    if (photosToDelete.length === 0) {
      return;
    }

    // Use sync API with deletedAt for soft delete (trash)
    const syncPayload = photosToDelete.map((p) => ({
      clientId: p.id,
      projectId: p.projectId,
      takenAt: p.takenAt.toISOString(),
      constructions: p.constructions,
      space: p.space,
      status: p.status,
      pendingType: p.pendingType,
      note: p.note,
      reportNote: p.reportNote,
      parentPhotoId: p.parentPhotoId,
      relatedPhotoIds: p.relatedPhotoIds,
      fileBase64: '', // No need to re-upload file for delete
      syncLevel: p.syncLevel,
      isEvidence: p.isEvidence,
      isSampled: p.isSampled,
      isReported: p.isReported,
      shares: p.shares as unknown as Record<string, unknown>[],
      deletedAt: new Date().toISOString(), // Set deletedAt for soft delete
    }));

    const response = await photoApi.sync(syncPayload);
    if (!response.success) {
      throw new Error('Photo soft deletion sync failed');
    }

    if (response.success) {
      // Mark synced photos as done
      for (const photo of photosToDelete) {
        if (photo.id) {
          await updatePhotoInIndexedDB(photo.id, {
            syncStatus: SyncStatus.DONE,
          });
        } else {
          console.warn('[batchSoftDeletePhotos] Skipping update: photo.id is undefined', photo);
        }
      }
    }
  };

  /**
   * Flush queued changes immediately, for example before leaving the timeline.
   */
  const flushSync = async () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    await executeSync();
  };

  /**
   * Stop the debounce timer without discarding the persistent queue.
   */
  const cancelSync = () => {
    if (syncTimer) {
      clearTimeout(syncTimer);
      syncTimer = null;
    }
    isSyncScheduled.value = dirtyPhotoIds.value.size > 0;
    persistPendingQueue();
    dispatchSyncStatus();
  };

  if (
    !syncTimer &&
    !isSyncing.value &&
    (dirtyPhotoIds.value.size > 0 ||
      deletePhotoIds.value.size > 0 ||
      softDeletePhotoIds.value.size > 0)
  ) {
    syncTimer = setTimeout(() => void executeSync(), SYNC_DELAY);
    isSyncScheduled.value = true;
    dispatchSyncStatus();
  }

  if (typeof window !== 'undefined') {
    setTimeout(dispatchSyncStatus, 0);

    if (!pageHideListenerAttached) {
      pageHideListenerAttached = true;
      const onAppLeave = () => void flushSync();
      window.addEventListener('beforeunload', onAppLeave);
      window.addEventListener('pagehide', onAppLeave);
    }
  }

  return {
    triggerSync,
    triggerDelete,
    triggerSoftDelete,
    flushSync,
    cancelSync,
    dirtyPhotoIds,
    deletePhotoIds,
    softDeletePhotoIds,
    isSyncing,
    isSyncScheduled,
  };
}
