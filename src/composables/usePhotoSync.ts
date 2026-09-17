import { ref } from 'vue';

import type { RemotePhoto } from '@/api/photo';

import { deletePhotoByClientId, photoApi } from '@/api/photo';
import { useAuthStore } from '@/stores/useAuthStore';
import { type LocalPhoto, PhotoSyncLevel, SyncStatus, UpdateSource } from '@/types/photo';
import {
  deletePhotoFromIndexedDB,
  getAllPhotosFromIndexedDB,
  getDB,
  getRawPhotosFromIndexedDB,
  savePhotoToIndexedDB,
  updatePhotoInIndexedDB,
} from '@/utils/indexedDB';
import { logError } from '@/utils/logger';

export interface PhotoSyncResult {
  merged: number;
  added: number;
  deleted: number;
  skipped: number;
}

/**
 * Merge a single remote photo into an existing local photo.
 *
 * Rules:
 *  - local.isDirty  → local wins (pending push to server)
 *  - remote.deletedAt is set (desktop soft-deleted) → sync deletion to local
 *  - remote.updatedAt newer → remote wins, merge into local (keep file blob)
 *  - equal or older → keep local as-is
 */
function mergeOne(local: LocalPhoto, remote: RemotePhoto): LocalPhoto {
  if (local.isDirty) {
    return local;
  }

  // If remote has deletedAt set (desktop soft-deleted), sync to local
  if (remote.deletedAt && !local.isDeleted) {
    return {
      ...local,
      isDeleted: true,
      trashedAt: new Date(remote.deletedAt),
      updatedAt: new Date(remote.updatedAt),
      updatedBy: remote.updatedBy === 'web' ? UpdateSource.WEB : UpdateSource.APP,
      userId: remote.userId ?? local.userId,
      uploadedBy: remote.uploadedBy ?? local.uploadedBy,
      synced: true,
      syncStatus: SyncStatus.DONE,
    };
  }

  // If remote doesn't have deletedAt but local is deleted (desktop restored), sync to local
  if (!remote.deletedAt && local.isDeleted && local.trashedAt) {
    return {
      ...local,
      isDeleted: false,
      trashedAt: undefined,
      updatedAt: new Date(remote.updatedAt),
      updatedBy: remote.updatedBy === 'web' ? UpdateSource.WEB : UpdateSource.APP,
      userId: remote.userId ?? local.userId,
      uploadedBy: remote.uploadedBy ?? local.uploadedBy,
      synced: true,
      syncStatus: SyncStatus.DONE,
    };
  }

  // Preserve local deletion state (trash) - don't override with remote if both are deleted
  if (local.isDeleted) {
    return local;
  }

  const remoteTime = new Date(remote.updatedAt).getTime();
  const localTime = new Date(local.updatedAt).getTime();

  if (remoteTime > localTime) {
    return {
      ...local,
      space: remote.space,
      status: remote.status as typeof local.status,
      resolvedAt:
        remote.resolvedAt !== undefined && remote.resolvedAt !== null
          ? new Date(remote.resolvedAt)
          : local.resolvedAt,
      note: remote.note ?? local.note,
      reportNote: remote.reportNote ?? local.reportNote,
      constructions: remote.constructions ?? local.constructions,
      pendingType: (remote.pendingType as typeof local.pendingType) ?? local.pendingType,
      parentPhotoId: remote.parentPhotoId ?? local.parentPhotoId,
      relatedPhotoIds: remote.relatedPhotoIds ?? local.relatedPhotoIds,
      syncLevel: remote.syncLevel ?? local.syncLevel,
      isEvidence: remote.isEvidence ?? local.isEvidence,
      userId: remote.userId ?? local.userId,
      uploadedBy: remote.uploadedBy ?? local.uploadedBy,
      updatedAt: new Date(remote.updatedAt),
      syncStatus: SyncStatus.DONE,
      isDirty: false,
    };
  }

  return {
    ...local,
    userId: remote.userId ?? local.userId,
    uploadedBy: remote.uploadedBy ?? local.uploadedBy,
  };
}

/**
 * Build a new LocalPhoto from a RemotePhoto that does not exist locally.
 * Downloads the image blob from the URL.
 */
async function remoteToLocal(
  remote: RemotePhoto,
  currentProjectId?: string
): Promise<LocalPhoto | null> {
  let file: Blob = new Blob();
  const imageUrl = remote.url ?? remote.thumbnailUrl ?? null;

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        file = await response.blob();
      }
    } catch (error) {
      logError(
        `[usePhotoSync] Error downloading image for ${remote.clientId}:`,
        error,
        'PhotoSync'
      );
    }
  }

  // If blob is empty, skip adding this photo
  if (file.size === 0) {
    return null;
  }

  return {
    id: remote.clientId, // Use clientId as the local ID to match with existing local photos
    file,
    takenAt: new Date(remote.takenAt),
    projectId: currentProjectId || remote.projectId || '',
    constructions: remote.constructions ?? [],
    space: remote.space,
    status: remote.status as LocalPhoto['status'],
    resolvedAt:
      remote.resolvedAt !== undefined && remote.resolvedAt !== null
        ? new Date(remote.resolvedAt)
        : undefined,
    pendingType: remote.pendingType as LocalPhoto['pendingType'],
    note: remote.note ?? '',
    reportNote: remote.reportNote ?? undefined,
    synced: true,
    syncStatus: SyncStatus.DONE,
    isDeleted: false,
    isDirty: false,
    updatedBy: remote.updatedBy === 'web' ? UpdateSource.WEB : UpdateSource.APP,
    userId: remote.userId,
    uploadedBy: remote.uploadedBy,
    syncLevel:
      remote.syncLevel ?? (remote.isEvidence ? PhotoSyncLevel.EVIDENCE : PhotoSyncLevel.THUMBNAIL),
    isEvidence: remote.isEvidence || remote.syncLevel === PhotoSyncLevel.EVIDENCE,
    isSampled: !(remote.isEvidence || remote.syncLevel === PhotoSyncLevel.EVIDENCE),
    isReported: false,
    parentPhotoId: remote.parentPhotoId ?? undefined,
    relatedPhotoIds: remote.relatedPhotoIds ?? [],
    shares: [],
    createdAt: new Date(remote.createdAt),
    updatedAt: new Date(remote.updatedAt),
  };
}

export function usePhotoSync() {
  const isSyncing = ref(false);
  const syncError = ref<string | null>(null);
  const authStore = useAuthStore();

  /**
   * Sync a project's photos between Supabase and IndexedDB.
   *
   * Called when: App enters a project page, or user pulls to refresh.
   *
   * Steps:
   *  1. Fetch remote photos for the project from Supabase
   *  2. Load local photos from IndexedDB
   *  3. Merge: apply remote updates to synced local photos
   *  4. Add remote photos that don't exist locally
   *  5. Mark local synced photos that are missing from remote as deleted (Web deleted them)
   */
  const syncProject = async (projectId: string): Promise<PhotoSyncResult> => {
    const result: PhotoSyncResult = { merged: 0, added: 0, deleted: 0, skipped: 0 };

    // Skip sync if user is not authenticated (unauthenticated users use local data only)
    if (!authStore.isAuthenticated) return result;

    isSyncing.value = true;
    syncError.value = null;

    try {
      const response = await photoApi.getByProjectId(projectId, true); // Include deleted photos for sync
      if (!response.data) {
        throw new Error('Failed to fetch remote photos');
      }

      const remoteList: RemotePhoto[] = response.data;
      // Use getRawPhotosFromIndexedDB to include deleted photos for proper sync comparison
      const localList: LocalPhoto[] = await getRawPhotosFromIndexedDB();
      const allLocalList: LocalPhoto[] = await getRawPhotosFromIndexedDB();

      // Use clientId for matching remote photos with local photos
      const remoteMap = new Map<string, RemotePhoto>(
        remoteList.map((r) => [r.clientId ?? r.id, r])
      );
      const localMap = new Map<string, LocalPhoto>(localList.map((l) => [l.id, l]));

      // Step 1: Push local deletions to Supabase (soft delete via deleted_at)
      const deletedLocalPhotos = allLocalList.filter(
        (p) => p.isDeleted && p.projectId === projectId
      );
      const trashedPhotosToSync = deletedLocalPhotos.filter((p) => p.trashedAt && p.synced);
      if (trashedPhotosToSync.length > 0) {
        try {
          const syncPayload = trashedPhotosToSync.map((deletedPhoto) => ({
            clientId: deletedPhoto.id,
            projectId: deletedPhoto.projectId,
            takenAt: deletedPhoto.takenAt.toISOString(),
            constructions: deletedPhoto.constructions,
            space: deletedPhoto.space,
            status: deletedPhoto.status,
            pendingType: deletedPhoto.pendingType,
            note: deletedPhoto.note,
            parentPhotoId: deletedPhoto.parentPhotoId,
            relatedPhotoIds: deletedPhoto.relatedPhotoIds,
            fileBase64: '', // No need to re-upload file
            syncLevel: deletedPhoto.syncLevel,
            isEvidence: deletedPhoto.isEvidence,
            isSampled: deletedPhoto.isSampled,
            isReported: deletedPhoto.isReported,
            shares: deletedPhoto.shares as unknown as Record<string, unknown>[],
            deletedAt: deletedPhoto.trashedAt
              ? deletedPhoto.trashedAt.toISOString()
              : new Date().toISOString(),
          }));

          const response = await photoApi.sync(syncPayload);
          const successfulClientIds = new Set(
            response.data?.results
              ?.filter((result) => result.success)
              .map(
                (result) =>
                  result.clientId || (result as { client_id?: string }).client_id || result.id
              )
              .filter(
                (clientId): clientId is string =>
                  typeof clientId === 'string' && clientId.length > 0
              ) ?? []
          );

          for (const deletedPhoto of trashedPhotosToSync) {
            if (successfulClientIds.has(deletedPhoto.id)) {
              await updatePhotoInIndexedDB(deletedPhoto.id, {
                syncStatus: SyncStatus.DONE,
              });
            }
            result.skipped++;
          }
        } catch (error) {
          logError('[usePhotoSync] Failed to batch sync trashed photos:', error, 'PhotoSync');
        }
      }

      const deletedIds = new Set<string>();
      for (const deletedPhoto of deletedLocalPhotos) {
        try {
          if (deletedPhoto.trashedAt) {
            // Trash: soft delete with deleted_at timestamp (keep cloud copy for recovery)
            if (!deletedPhoto.synced) {
              result.skipped++;
            }
            continue;
          } else if (deletedPhoto.synced) {
            // Permanent delete of synced photo: remove from Supabase then local using clientId
            const success = await deletePhotoByClientId(deletedPhoto.id);
            if (success) {
              await deletePhotoFromIndexedDB(deletedPhoto.id);
              result.deleted++;
              deletedIds.add(deletedPhoto.id);
            }
          } else {
            // Permanent delete of unsynced photo: just remove locally
            await deletePhotoFromIndexedDB(deletedPhoto.id);
            result.deleted++;
          }
        } catch (error) {
          console.error(`[usePhotoSync] Failed to delete photo ${deletedPhoto.id}:`, error);
        }
      }

      for (const local of localList) {
        if (local.projectId !== projectId) continue;

        if (!local.synced) {
          result.skipped++;
          continue;
        }

        const remote = remoteMap.get(local.id);

        if (!remote) {
          // The remote project response is authoritative. Remove local photos that
          // were permanently deleted by another project member, including evidence photos.
          await deletePhotoFromIndexedDB(local.id);
          result.deleted++;
          continue;
        }

        // If local blob is empty, download from remote URL
        if (local.file.size === 0 && (remote.url || remote.thumbnailUrl)) {
          try {
            const response = await fetch(remote.url ?? remote.thumbnailUrl ?? '');
            if (response.ok) {
              const newBlob = await response.blob();
              if (newBlob.size > 0) {
                await updatePhotoInIndexedDB(local.id, { file: newBlob });
                result.merged++;
              }
            }
          } catch (error) {
            console.error(`[usePhotoSync] Error redownloading image for ${local.id}:`, error);
          }
        }

        const merged = mergeOne(local, remote);
        if (merged !== local) {
          await updatePhotoInIndexedDB(local.id, merged);
          result.merged++;
        } else {
          result.skipped++;
        }
      }

      for (const remote of remoteList) {
        const remoteKey = remote.clientId ?? remote.id;

        if (!localMap.has(remoteKey)) {
          // Skip photos that were just deleted in this sync
          if (deletedIds.has(remoteKey)) {
            continue;
          }

          // Check if the photo record exists in IndexedDB (even if marked as deleted or blob is missing)
          // This prevents re-adding photos that are in trash
          const database = await getDB();
          const localPhotoId = remote.clientId ?? remote.id;
          const recordExists = await new Promise<boolean>((resolve) => {
            const transaction = database.transaction(['localPhotos'], 'readonly');
            const objectStore = transaction.objectStore('localPhotos');
            const request = objectStore.get(localPhotoId);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
          });

          if (recordExists) {
            continue;
          }

          // Download missing cloud photos regardless of source so a fresh device can hydrate
          const newLocal = await remoteToLocal(remote, projectId);
          if (newLocal) {
            await savePhotoToIndexedDB(newLocal);
            result.added++;
          }
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown sync error';
      syncError.value = message;
      console.error('[usePhotoSync] syncProject failed:', message);
    } finally {
      isSyncing.value = false;
    }

    return result;
  };

  /**
   * Push a single dirty local photo to Supabase.
   * Called after user edits a photo on the App side.
   */
  const pushDirtyPhoto = async (photoId: string): Promise<boolean> => {
    try {
      const localList = await getAllPhotosFromIndexedDB();
      const photo = localList.find((p) => p.id === photoId);

      if (!photo || !photo.synced || !photo.isDirty) return false;

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
        },
      ]);

      await updatePhotoInIndexedDB(photoId, {
        isDirty: false,
        syncStatus: SyncStatus.DONE,
        updatedBy: UpdateSource.APP,
      });

      return true;
    } catch (err: unknown) {
      console.error('[usePhotoSync] pushDirtyPhoto failed:', err);
      return false;
    }
  };

  return {
    isSyncing,
    syncError,
    syncProject,
    pushDirtyPhoto,
  };
}
