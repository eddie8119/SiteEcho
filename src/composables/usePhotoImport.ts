import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';

import type { LocalPhoto } from '@/types/photo';

import { PendingType, PhotoStatus, PhotoSyncLevel, SyncStatus, UpdateSource } from '@/types/photo';
import { compressImage } from '@/utils/imageCompression';
import { savePhotoToIndexedDB } from '@/utils/indexedDB';

export interface ImportSettings {
  space: string | null;
  constructions: string[];
  isPending: boolean;
}

export function usePhotoImport() {
  const isImporting = ref(false);
  const importProgress = ref(0);
  const totalToImport = ref(0);
  const importedCount = ref(0);

  const chunk = <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  };

  const importPhotos = async (files: File[], projectId: string, settings: ImportSettings) => {
    // Check if project ID is available
    if (!projectId) {
      console.error('[usePhotoImport] No project ID provided, cannot import photos');
      return 0;
    }

    isImporting.value = true;
    totalToImport.value = files.length;
    importedCount.value = 0;
    importProgress.value = 0;

    const { space, constructions, isPending } = settings;
    const status: PhotoStatus = isPending ? PhotoStatus.PENDING : PhotoStatus.NORMAL;
    const pendingType: PendingType | null = null;

    const fileChunks = chunk(files, 20);

    for (const fileChunk of fileChunks) {
      await Promise.all(
        fileChunk.map(async (file) => {
          try {
            // Compress image before saving
            const compressedBlob = await compressImage(file, 1280, 0.9);

            const now = new Date();
            const photo: LocalPhoto = {
              id: uuidv4(),
              file: compressedBlob,
              takenAt: new Date(file.lastModified),
              projectId,
              constructions: [...constructions],
              space,
              status,
              pendingType,
              note: '',
              synced: false,
              syncStatus: SyncStatus.PENDING,
              isDeleted: false,
              isDirty: false,
              updatedBy: UpdateSource.APP,
              syncLevel: PhotoSyncLevel.NONE,
              isEvidence: false,
              isSampled: false,
              isReported: false,
              shares: [],
              createdAt: now,
              updatedAt: now,
            };

            await savePhotoToIndexedDB(photo);
            importedCount.value++;
            importProgress.value = Math.floor((importedCount.value / totalToImport.value) * 100);
          } catch (error) {
            console.error(`Failed to import file ${file.name}:`, error);
          }
        })
      );
    }

    isImporting.value = false;
    return importedCount.value;
  };

  return {
    isImporting,
    importProgress,
    totalToImport,
    importedCount,
    importPhotos,
  };
}
