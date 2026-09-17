import JSZip from 'jszip';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { BackupData } from '@/types/backup';
import type { LocalPhoto } from '@/types/photo';

import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { SyncStatus, UpdateSource } from '@/types/photo';
import {
  getAllPhotosFromIndexedDB,
  getProjectsFromIndexedDB,
  savePhotoToIndexedDB,
  saveProjectToIndexedDB,
} from '@/utils/indexedDB';

export enum BackupActionKey {
  EXPORT = 'export',
  IMPORT = 'import',
}

const getPhotoFileExtension = (blob: Blob) => {
  if (blob.type === 'image/png') return 'png';
  if (blob.type === 'image/webp') return 'webp';
  return 'jpg';
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

export const useBackupManager = () => {
  const { t } = useI18n();
  const isExporting = ref(false);
  const exportSuccess = ref(false);
  const isImporting = ref(false);
  const importError = ref<string | null>(null);
  const importSuccess = ref(false);
  const importInputRef = ref<HTMLInputElement | null>(null);
  const importProgress = ref(0);
  const importTotal = ref(0);
  const importProcessed = ref(0);
  const { updatePhotoCount } = useRegistrationFlow();

  const handleExportBackup = async () => {
    isExporting.value = true;
    exportSuccess.value = false;
    try {
      const [photos, projects] = await Promise.all([
        getAllPhotosFromIndexedDB(),
        getProjectsFromIndexedDB(),
      ]);

      const zip = new JSZip();

      for (const photo of photos) {
        const extension = getPhotoFileExtension(photo.file);
        zip.file(`photos/${photo.id}.${extension}`, photo.file);
      }

      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        projects,
        photos: photos.map((photo) => ({
          id: photo.id,
          projectId: photo.projectId,
          takenAt: photo.takenAt,
          constructions: photo.constructions,
          space: photo.space,
          status: photo.status,
          pendingType: photo.pendingType,
          note: photo.note,
          synced: photo.synced,
          syncStatus: photo.syncStatus,
          syncLevel: photo.syncLevel,
          isEvidence: photo.isEvidence,
          isSampled: photo.isSampled,
          isReported: photo.isReported,
          isDeleted: photo.isDeleted,
          isDirty: photo.isDirty,
          updatedBy: photo.updatedBy,
          trashedAt: photo.trashedAt,
          reportNote: photo.reportNote,
          createdAt: photo.createdAt,
          updatedAt: photo.updatedAt,
          fileName: `photos/${photo.id}.${getPhotoFileExtension(photo.file)}`,
          shares: photo.shares || [],
          parentPhotoId: photo.parentPhotoId,
          relatedPhotoIds: photo.relatedPhotoIds,
        })),
      };

      zip.file('data.json', JSON.stringify(data, null, 2));

      const backupBlob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      downloadBlob(backupBlob, `backup-${timestamp}.zip`);
      exportSuccess.value = true;
    } catch (error) {
      console.error('Export backup failed:', error);
    } finally {
      isExporting.value = false;
    }
  };

  const triggerImportBackup = () => {
    importInputRef.value?.click();
  };

  const handleImportBackup = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    isImporting.value = true;
    importError.value = null;
    importSuccess.value = false;
    importProgress.value = 0;
    importProcessed.value = 0;
    importTotal.value = 0;
    try {
      const zip = await JSZip.loadAsync(file);
      const dataFile = zip.file('data.json');
      if (!dataFile) {
        throw new Error(t('setting.backup.missingDataJson'));
      }

      const dataText = await dataFile.async('string');
      const backup = JSON.parse(dataText) as BackupData;

      if (!backup.photos || !Array.isArray(backup.photos)) {
        throw new Error(t('setting.backup.invalidPhotoData'));
      }

      // Set total for progress tracking
      importTotal.value = backup.photos.length;
      importProgress.value = 10; // Initial progress after loading zip

      // Merge mode: don't clear existing data, merge instead
      // Merge projects
      for (const project of backup.projects || []) {
        await saveProjectToIndexedDB({
          ...project,
          createdAt: new Date(project.createdAt),
          lastUsedAt: new Date(project.lastUsedAt),
          updatedAt: new Date(project.updatedAt),
        });
      }

      // Merge photos
      let missingFileCount = 0;
      for (const photoMeta of backup.photos || []) {
        const photoFile = zip.file(photoMeta.fileName);
        if (!photoFile) {
          console.warn(`Missing photo file in zip: ${photoMeta.fileName}`);
          missingFileCount++;
          importProcessed.value++;
          continue;
        }

        const blob = await photoFile.async('blob');
        const photo: LocalPhoto = {
          id: photoMeta.id,
          file: blob,
          takenAt: new Date(photoMeta.takenAt),
          projectId: photoMeta.projectId,
          constructions: photoMeta.constructions || [],
          space: photoMeta.space,
          status: photoMeta.status,
          pendingType: photoMeta.pendingType,
          note: photoMeta.note,
          synced: photoMeta.synced,
          syncStatus:
            photoMeta.syncStatus || (photoMeta.synced ? SyncStatus.DONE : SyncStatus.PENDING),
          syncLevel: photoMeta.syncLevel || 'none',
          isEvidence: photoMeta.isEvidence || false,
          isSampled: photoMeta.isSampled || false,
          isReported: photoMeta.isReported || false,
          isDeleted: photoMeta.isDeleted || false,
          isDirty: photoMeta.isDirty || false,
          updatedBy: photoMeta.updatedBy || UpdateSource.APP,
          trashedAt: photoMeta.trashedAt ? new Date(photoMeta.trashedAt) : undefined,
          reportNote: photoMeta.reportNote,
          shares: photoMeta.shares || [],
          createdAt: new Date(photoMeta.createdAt),
          updatedAt: new Date(photoMeta.updatedAt),
          parentPhotoId: photoMeta.parentPhotoId,
          relatedPhotoIds: photoMeta.relatedPhotoIds,
        };
        await savePhotoToIndexedDB(photo);
        importProcessed.value++;
        // Calculate progress (10% to 90% during photo processing)
        importProgress.value = 10 + Math.floor((importProcessed.value / importTotal.value) * 80);
      }

      if (missingFileCount > 0) {
        importError.value = t('setting.backup.missingPhotoFiles', { count: missingFileCount });
      }

      await updatePhotoCount();
      importProgress.value = 100; // Complete
      importSuccess.value = true;
    } catch (error) {
      console.error('Import backup failed:', error);
      if (error instanceof Error) {
        if (error.message.includes('JSON')) {
          importError.value = t('setting.backup.corruptData');
        } else if (error.message.includes('zip')) {
          importError.value = t('setting.backup.invalidZip');
        } else {
          importError.value = error.message;
        }
      } else {
        importError.value = t('setting.backup.unknownError');
      }
    } finally {
      isImporting.value = false;
      input.value = '';
    }
  };

  return {
    exportSuccess,
    isExporting,
    isImporting,
    importError,
    importSuccess,
    importInputRef,
    importProgress,
    importTotal,
    importProcessed,
    handleExportBackup,
    triggerImportBackup,
    handleImportBackup,
  };
};
