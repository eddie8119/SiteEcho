import type { PhotoSyncPayloadItem } from '@/api/photo';

import { photoApi } from '@/api/photo';
import { removeFollowUpPhoto } from '@/composables/useFollowUpPhotoRelations';
import {
  type LocalPhoto,
  PhotoStatus,
  PhotoSyncLevel,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';
import {
  deletePhotoFromIndexedDB,
  getAllPhotosFromIndexedDB,
  getPhotoFromIndexedDB,
  updatePhotoInIndexedDB,
} from '@/utils/indexedDB';
import { logWarn } from '@/utils/logger';

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

interface FollowUpDraftSnapshot {
  status: PhotoStatus;
  resolvedAt?: string;
  syncLevel: PhotoSyncLevel;
  isEvidence: boolean;
  synced: boolean;
  syncStatus: SyncStatus;
  isDirty: boolean;
}

const getDraftKey = (photoId: string) => `follow-up-draft:${photoId}`;

const saveDraftSnapshot = (photoId: string, snapshot: FollowUpDraftSnapshot) => {
  sessionStorage.setItem(getDraftKey(photoId), JSON.stringify(snapshot));
};

const readDraftSnapshot = (photoId: string): FollowUpDraftSnapshot | null => {
  const raw = sessionStorage.getItem(getDraftKey(photoId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as FollowUpDraftSnapshot;
  } catch (error) {
    logWarn('[useFollowUpPhotoFlow] Failed to parse draft snapshot:', error, 'FollowUpPhotoFlow');
    return null;
  }
};

const clearDraftSnapshot = (photoId: string) => {
  sessionStorage.removeItem(getDraftKey(photoId));
};

const buildLayer3Payload = async (photo: LocalPhoto): Promise<PhotoSyncPayloadItem> => {
  return {
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
    fileBase64: await blobToBase64(photo.file),
    mimeType: photo.file.type || 'image/jpeg',
    syncLevel: PhotoSyncLevel.EVIDENCE,
    isEvidence: true,
    isSampled: photo.isSampled,
    isReported: photo.isReported,
    shares: photo.shares as unknown as Record<string, unknown>[],
  };
};

const promoteLocalPhotoToLayer3 = async (photoId: string): Promise<LocalPhoto | null> => {
  const photo = await getPhotoFromIndexedDB(photoId);
  if (!photo) return null;

  await updatePhotoInIndexedDB(photoId, {
    status: photo.status === PhotoStatus.RESOLVED ? PhotoStatus.RESOLVED : photo.status,
    resolvedAt:
      photo.status === PhotoStatus.RESOLVED ? (photo.resolvedAt ?? new Date()) : photo.resolvedAt,
    syncLevel: PhotoSyncLevel.EVIDENCE,
    isEvidence: true,
    synced: false,
    syncStatus: SyncStatus.PENDING,
    isDirty: true,
    updatedBy: UpdateSource.APP,
  });

  return {
    ...photo,
    syncLevel: PhotoSyncLevel.EVIDENCE,
    isEvidence: true,
    synced: false,
    syncStatus: SyncStatus.PENDING,
    isDirty: true,
    updatedBy: UpdateSource.APP,
  };
};

export function useFollowUpPhotoFlow() {
  const stageResolvedForFollowUp = async (photoId: string): Promise<boolean> => {
    const photo = await getPhotoFromIndexedDB(photoId);
    if (!photo) return false;

    saveDraftSnapshot(photoId, {
      status: photo.status,
      resolvedAt: photo.resolvedAt ? photo.resolvedAt.toISOString() : undefined,
      syncLevel: photo.syncLevel,
      isEvidence: photo.isEvidence,
      synced: photo.synced,
      syncStatus: photo.syncStatus,
      isDirty: photo.isDirty,
    });

    await updatePhotoInIndexedDB(photoId, {
      status: PhotoStatus.RESOLVED,
      resolvedAt: new Date(),
      syncLevel: PhotoSyncLevel.NONE,
      isEvidence: false,
      synced: false,
      syncStatus: SyncStatus.PENDING,
      isDirty: true,
      updatedBy: UpdateSource.APP,
    });

    return true;
  };

  const restoreFollowUpDraft = async (
    parentPhotoId: string,
    capturedPhotoIds: string[],
    options?: { restoreParent?: boolean }
  ): Promise<void> => {
    for (const capturedPhotoId of capturedPhotoIds) {
      await removeFollowUpPhoto(parentPhotoId, capturedPhotoId);
      await deletePhotoFromIndexedDB(capturedPhotoId);
    }

    if (options?.restoreParent === false) {
      return;
    }

    const parentPhoto = await getPhotoFromIndexedDB(parentPhotoId);
    if (!parentPhoto) return;

    const snapshot = readDraftSnapshot(parentPhotoId);
    if (snapshot) {
      await updatePhotoInIndexedDB(parentPhotoId, {
        status: snapshot.status,
        resolvedAt: snapshot.resolvedAt ? new Date(snapshot.resolvedAt) : undefined,
        syncLevel: snapshot.syncLevel,
        isEvidence: snapshot.isEvidence,
        synced: snapshot.synced,
        syncStatus: snapshot.syncStatus,
        isDirty: snapshot.isDirty,
        updatedBy: UpdateSource.APP,
      });
      clearDraftSnapshot(parentPhotoId);
      return;
    }

    await updatePhotoInIndexedDB(parentPhotoId, {
      status: PhotoStatus.PENDING,
      resolvedAt: undefined,
      syncLevel: PhotoSyncLevel.NONE,
      isEvidence: false,
      synced: false,
      syncStatus: SyncStatus.PENDING,
      isDirty: false,
      updatedBy: UpdateSource.APP,
    });
  };

  const finalizeLayer3Photos = async (
    photoIds: string[],
    resolvedParentPhotoId?: string | null
  ): Promise<boolean> => {
    const uniquePhotoIds = [
      ...new Set(photoIds.filter((id) => typeof id === 'string' && id.length > 0)),
    ];
    if (uniquePhotoIds.length === 0) return false;

    const allPhotos = await getAllPhotosFromIndexedDB();
    const photosToPromote = allPhotos.filter((photo) => uniquePhotoIds.includes(photo.id));

    if (photosToPromote.length === 0) return false;

    const payloads = await Promise.all(photosToPromote.map((photo) => buildLayer3Payload(photo)));
    const response = await photoApi.sync(payloads);

    if (!response.success || !response.data) {
      return false;
    }

    const successfulClientIds = new Set(
      response.data.results
        .filter((result) => result.success)
        .map(
          (result) => result.clientId || (result as { client_id?: string }).client_id || result.id
        )
        .filter(
          (clientId): clientId is string => typeof clientId === 'string' && clientId.length > 0
        )
    );
    const hasFailures = response.data.failed > 0;

    for (const photo of photosToPromote) {
      if (!successfulClientIds.has(photo.id)) {
        continue;
      }

      const isResolvedParent = resolvedParentPhotoId
        ? photo.id === resolvedParentPhotoId
        : photo.status === PhotoStatus.RESOLVED;

      await updatePhotoInIndexedDB(photo.id, {
        status: isResolvedParent ? PhotoStatus.RESOLVED : photo.status,
        resolvedAt: isResolvedParent ? (photo.resolvedAt ?? new Date()) : photo.resolvedAt,
        syncLevel: PhotoSyncLevel.EVIDENCE,
        isEvidence: true,
        synced: true,
        syncStatus: SyncStatus.DONE,
        isDirty: false,
        updatedBy: UpdateSource.APP,
      });
    }

    if (!hasFailures) {
      for (const photoId of uniquePhotoIds) {
        clearDraftSnapshot(photoId);
      }
    }

    return !hasFailures;
  };

  const finalizeResolvedPhoto = async (photoId: string): Promise<boolean> => {
    const stagedPhoto = await promoteLocalPhotoToLayer3(photoId);
    if (!stagedPhoto) return false;

    return finalizeLayer3Photos([photoId], photoId);
  };

  return {
    stageResolvedForFollowUp,
    restoreFollowUpDraft,
    finalizeLayer3Photos,
    finalizeResolvedPhoto,
  };
}
