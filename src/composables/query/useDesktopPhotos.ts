import { computed, type MaybeRefOrGetter } from 'vue';

import { usePhotos } from './usePhoto';

import {
  PendingType,
  type PhotoRecord,
  PhotoStatus,
  PhotoSyncLevel,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';

interface UseDesktopPhotosOptions {
  projectId?: MaybeRefOrGetter<string | undefined>;
}

export const useDesktopPhotos = (options?: UseDesktopPhotosOptions) => {
  const {
    photos: remotePhotos,
    isLoadingPhotos,
    photosError,
    refetchPhotos,
  } = usePhotos({ projectId: options?.projectId });

  const photos = computed<PhotoRecord[] | undefined>(() => {
    if (!remotePhotos.value) return undefined;

    // Filter out soft-deleted photos (deletedAt is set)
    const activePhotos = remotePhotos.value.filter((rp) => !rp.deletedAt);

    return activePhotos.map((rp) => ({
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
      status: rp.status as PhotoStatus,
      pendingType: rp.pendingType as PendingType,
      note: rp.note || '',
      reportNote: rp.reportNote || undefined,
      synced: true,
      syncStatus: SyncStatus.DONE,
      isDeleted: false,
      updatedBy: rp.updatedBy === 'web' ? UpdateSource.WEB : UpdateSource.APP,
      syncLevel: rp.isEvidence ? PhotoSyncLevel.EVIDENCE : PhotoSyncLevel.THUMBNAIL,
      isEvidence: rp.isEvidence,
      isSampled: !rp.isEvidence,
      isReported: false,
      parentPhotoId: rp.parentPhotoId || undefined,
      relatedPhotoIds: rp.relatedPhotoIds || [],
      shares: [],
      userId: rp.userId,
      deletedAt: rp.deletedAt ? new Date(rp.deletedAt) : null,
    }));
  });

  return {
    photos,
    isLoadingPhotos,
    photosError,
    refetchPhotos,
  };
};
