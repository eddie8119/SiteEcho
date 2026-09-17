import { v4 as uuidv4 } from 'uuid';
import { computed, type ComputedRef, type Ref, ref } from 'vue';

import type { LocalPhoto } from '@/types/photo';

import { useFollowUpPhotoRelations } from '@/composables/useFollowUpPhotoRelations';
import { usePhotoSampling } from '@/composables/usePhotoSampling';
import { PhotoStatus, SyncStatus, UpdateSource } from '@/types/photo';
import { AnalyticsEvent, track } from '@/utils/analytics';
import { analyzeImageBrightness } from '@/utils/imageBrightness';
import { compressImage } from '@/utils/imageCompression';
import { savePhotoToIndexedDB } from '@/utils/indexedDB';

interface UseCameraCaptureOptions {
  currentProjectId:
    | string
    | null
    | Ref<string | null>
    | ComputedRef<string | null>
    | (() => string | null);
  isPending: Ref<boolean>;
  parentPhotoId?:
    | string
    | null
    | Ref<string | null>
    | ComputedRef<string | null>
    | (() => string | null);
  onSuccess?: () => void;
  onPhotoSaved?: () => Promise<void>;
  t: (key: string) => string;
}

export function useCameraCapture(options: UseCameraCaptureOptions) {
  const { determineSyncStrategy } = usePhotoSampling();
  const { addFollowUpPhoto } = useFollowUpPhotoRelations();

  const lastPhotoId = ref<string | null>(null);
  const showToast = ref(false);
  const toastMessage = ref(options.t('camera.take_photo.recorded'));
  const showDarkToast = ref(false);
  const preferHighQualityUntil = ref(0);

  const isHighQualityMode = computed(() => {
    return Date.now() < preferHighQualityUntil.value;
  });

  const activateHighQualityMode = (minutes: number = 5) => {
    preferHighQualityUntil.value = Date.now() + minutes * 60 * 1000;
  };

  const deactivateHighQualityMode = () => {
    preferHighQualityUntil.value = 0;
  };

  const processCapturedPhoto = async (blob: Blob | File, isFromWebCamera: boolean = false) => {
    try {
      // Check if project ID is available
      let projectId: string | null;
      if (typeof options.currentProjectId === 'function') {
        projectId = options.currentProjectId();
      } else if (
        typeof options.currentProjectId === 'object' &&
        options.currentProjectId !== null &&
        'value' in options.currentProjectId
      ) {
        projectId = options.currentProjectId.value;
      } else {
        projectId = options.currentProjectId;
      }

      if (!projectId) {
        console.error('[useCameraCapture] No current project ID, cannot save photo');
        toastMessage.value = options.t('camera.take_photo.select_project_first');
        showToast.value = true;
        return;
      }

      // Compress to 1280px for local storage (Layer 1)
      // Skip EXIF handling for web camera captures (canvas-generated), keep it for system camera files
      const compressedBlob = await compressImage(blob, 1280, 0.9, isFromWebCamera);

      // Create local photo record
      const now = new Date();

      // Determine sync strategy (Layer 2 & 3)
      const { isEvidence, isSampled, syncLevel } = await determineSyncStrategy();
      let parentPhotoId: string | undefined;
      if (typeof options.parentPhotoId === 'function') {
        parentPhotoId = options.parentPhotoId() || undefined;
      } else if (
        typeof options.parentPhotoId === 'object' &&
        options.parentPhotoId !== null &&
        'value' in options.parentPhotoId
      ) {
        parentPhotoId = options.parentPhotoId.value || undefined;
      } else {
        parentPhotoId = options.parentPhotoId || undefined;
      }

      const photo: LocalPhoto = {
        id: uuidv4(),
        file: compressedBlob,
        takenAt: now,
        projectId,
        constructions: [],
        space: null,
        status: options.isPending.value ? PhotoStatus.PENDING : PhotoStatus.NORMAL,
        pendingType: null,
        note: '',
        synced: false,
        syncStatus: SyncStatus.PENDING,
        isDeleted: false,
        isDirty: false,
        updatedBy: UpdateSource.APP,
        syncLevel,
        isEvidence,
        isSampled,
        isReported: false,
        parentPhotoId,
        relatedPhotoIds: [],
        shares: [],
        createdAt: now,
        updatedAt: now,
      };

      // Save to IndexedDB immediately
      await savePhotoToIndexedDB(photo);
      track(AnalyticsEvent.PHOTOS_CREATED);

      // Store photo ID for toast actions
      lastPhotoId.value = photo.id;

      if (parentPhotoId) {
        try {
          await addFollowUpPhoto(parentPhotoId, photo.id);
        } catch (error) {
          console.warn('[useCameraCapture] Failed to link follow-up photo:', error);
        }
      }

      // Show success toast
      if (parentPhotoId) {
        toastMessage.value = `${options.t('camera.take_photo.recorded')}. ${options.t('camera.take_photo.done_hint')}`;
      } else {
        toastMessage.value = options.t('camera.take_photo.recorded');
      }
      showToast.value = true;

      // Call callbacks
      if (options.onPhotoSaved) {
        await options.onPhotoSaved();
      }
      if (options.onSuccess) {
        options.onSuccess();
      }

      // Auto-hide toast after 3 seconds
      setTimeout(() => {
        showToast.value = false;
      }, 3000);

      // Brightness detection (non-blocking)
      setTimeout(async () => {
        const result = await analyzeImageBrightness(blob);

        if (isHighQualityMode.value) {
          // Exit condition: if brightness is normal (> 80), deactivate HQ mode immediately
          if (result.avgBrightness > 80) {
            deactivateHighQualityMode();
          }
        } else {
          // Enter condition: if detected as dark, suggest HQ mode
          if (result.isDark) {
            showDarkToast.value = true;
          }
        }
      }, 0);
    } catch (error) {
      console.error('Failed to process photo:', error);
    }
  };

  return {
    lastPhotoId,
    showToast,
    toastMessage,
    showDarkToast,
    isHighQualityMode,
    activateHighQualityMode,
    deactivateHighQualityMode,
    processCapturedPhoto,
  };
}
