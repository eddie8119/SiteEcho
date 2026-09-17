<template>
  <div class="flex h-screen flex-col">
    <MobileHeader :title="t('title.edit_photo')" :on-back="handleCancel">
      <template #back-icon>
        <svg class="h-6 w-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </template>
    </MobileHeader>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-4 py-4 pb-20">
      <PhotoEditForm
        ref="formRef"
        :photo="photo"
        :parent-photo="parentPhoto"
        :related-photos="relatedPhotos"
        :show-space-selection="true"
        :show-pending-type-selection="isFromPending"
        mode="edit"
        :on-add-follow-up="handleAddFollowUpPhoto"
        :on-remove-related-photo="handleRequestRemoveRelatedPhoto"
        :on-generate-follow-up-report="handleGenerateFollowUpReport"
        :on-discard="handleDiscard"
        :on-cancel="handleCancel"
        :on-confirm="handleFinalConfirm"
      />
      <!-- Share records -->
      <ShareRecordsList v-if="photo" :shares="photo.shares" />
    </div>

    <DeleteDialog
      v-model="showRemoveFollowUpConfirm"
      :target="t('photo.evidence_chain.follow_up_photo')"
      :subject="t('photo.comparison.follow_up')"
      :body-text="removeFollowUpConfirmText"
      @confirm="handleConfirmRemoveRelatedPhoto"
    />

    <!-- Follow-up Upgrade Prompt -->
    <UpgradePromptSheet
      v-model="showUpgradePrompt"
      :title="t('photo.upgrade_prompt.title')"
      :description="t('photo.upgrade_prompt.description', { count: FREE_FOLLOW_UP_LIMIT })"
    />

    <!-- Report Generation Sheet for Follow-up -->
    <ReportGenerationSheet
      v-if="showReportSheet"
      :model-value="showReportSheet"
      :selected-photos="reportSelectedPhotos"
      :fixed-purpose="Purpose.FollowUp"
      @update:model-value="showReportSheet = $event"
      @download-pdf="handleDownloadPdf"
      @download-word="handleDownloadWord"
    />

    <input
      ref="followUpFileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFollowUpFileChange"
    />

    <FollowUpSourceDialog
      v-model="showFollowUpDialog"
      :title="t('camera.take_photo.follow_up_mode')"
      @select-album="selectAlbumImport"
      @select-camera="selectCameraCapture"
    />

    <!-- Registration Prompt -->
    <RegisterPromptSheet
      v-model="showRegisterPrompt"
      :reason="promptReason"
      :photo-count="photoCount"
      @login="redirectToLogin"
    />
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

import { deletePhotoByClientId, photoApi } from '@/api/photo';
import RegisterPromptSheet from '@/components/auth/RegisterPromptSheet.vue';
import UpgradePromptSheet from '@/components/billing/UpgradePromptSheet.vue';
import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import MobileHeader from '@/components/core/header/MobileHeader.vue';
import FollowUpSourceDialog from '@/components/photo/FollowUpSourceDialog.vue';
import PhotoEditForm from '@/components/photo/PhotoEditForm.vue';
import ShareRecordsList from '@/components/photo/ShareRecordsList.vue';
import ReportGenerationSheet from '@/components/timeline/report/ReportGenerationSheet.vue';
import { useFollowUpPhotoFlow } from '@/composables/useFollowUpPhotoFlow';
import { addFollowUpPhoto, removeFollowUpPhoto } from '@/composables/useFollowUpPhotoRelations';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { EvidenceAction } from '@/composables/useTimelineMultiSelect';
import { FREE_FOLLOW_UP_LIMIT } from '@/config/planConfig';
import { PhotoStatus, PhotoSyncLevel, SyncStatus, UpdateSource } from '@/types/photo';
import { Purpose } from '@/types/report';
import { compressImage } from '@/utils/imageCompression';
import {
  getAllPhotosFromIndexedDB,
  getPhotoFromIndexedDB,
  savePhotoToIndexedDB,
  updatePhotoInIndexedDB,
} from '@/utils/indexedDB';

const { t } = useI18n();

type PhotoLike = LocalPhoto | PhotoRecord;

const router = useRouter();
const route = useRoute();
const {
  showRegisterPrompt,
  promptReason,
  photoCount,
  updatePhotoCount,
  checkFollowUpTrigger,
  consumeFollowUpPhoto,
  showUpgradePrompt,
  redirectToLogin,
} = useRegistrationFlow();

// Check if navigation is from pending page
const isFromPending = computed(() => route.query.from === 'pending');

const formRef = ref<InstanceType<typeof PhotoEditForm> | null>(null);
const photo = ref<LocalPhoto | null>(null);
const parentPhoto = ref<LocalPhoto | null>(null);
const relatedPhotos = ref<LocalPhoto[]>([]);
const selectedRelatedPhoto = ref<PhotoLike | null>(null);
const showRemoveFollowUpConfirm = ref(false);
const removeFollowUpConfirmText = computed(() => t('photo.dialog.cannot_undo'));
const isLoading = ref(true);
const showReportSheet = ref(false);
const showFollowUpDialog = ref(false);
const followUpFileInput = ref<HTMLInputElement | null>(null);

// Prepare photos for follow-up report (parent + follow-up photos)
const reportSelectedPhotos = computed(() => {
  if (!photo.value) return [];
  const photos: LocalPhoto[] = [photo.value];
  photos.push(...relatedPhotos.value);
  return photos;
});

const loadRelatedPhotos = async (loadedPhoto: LocalPhoto) => {
  parentPhoto.value = null;
  relatedPhotos.value = [];

  const allPhotos = await getAllPhotosFromIndexedDB();
  const chainRootId = loadedPhoto.parentPhotoId ?? loadedPhoto.id;

  if (loadedPhoto.parentPhotoId) {
    parentPhoto.value =
      allPhotos.find((item) => item.id === loadedPhoto.parentPhotoId && !item.isDeleted) || null;
  }

  relatedPhotos.value = allPhotos.filter(
    (item): item is LocalPhoto =>
      item.projectId === loadedPhoto.projectId &&
      !item.isDeleted &&
      item.parentPhotoId === chainRootId &&
      item.id !== loadedPhoto.id
  );
};

const handleAddFollowUpPhoto = async () => {
  if (!photo.value) {
    return;
  }

  const canProceed = checkFollowUpTrigger();
  if (!canProceed || !(await consumeFollowUpPhoto())) {
    if (canProceed) showUpgradePrompt.value = true;
    return;
  }

  showFollowUpDialog.value = true;
};

const handleGenerateFollowUpReport = () => {
  if (!photo.value || relatedPhotos.value.length === 0) {
    return;
  }

  // Open report generation sheet directly for this follow-up report
  showReportSheet.value = true;
};

const handleDownloadPdf = async (_data: {
  purpose: string | null;
  groups: Record<string, Record<string, { photo: LocalPhoto }>>;
  billing: Record<string, number> | null;
  groupNotes: Record<string, string>;
  photoNotes: Record<string, string>;
  followUpGroups?: Array<{
    parentId: string;
    parentPhoto: LocalPhoto;
    followUpPhotos: LocalPhoto[];
    space: string;
    note: string;
    constructions: string[];
    pendingType?: string;
    resolvedAt: Date;
  }>;
}) => {
  // Delegate to parent page to handle PDF generation
  // For now, just close the sheet
  showReportSheet.value = false;
};

const handleDownloadWord = async (_data: {
  purpose: string | null;
  groups: Record<string, Record<string, { photo: LocalPhoto }>>;
  billing: Record<string, number> | null;
  groupNotes: Record<string, string>;
  photoNotes: Record<string, string>;
  followUpGroups?: Array<{
    parentId: string;
    parentPhoto: LocalPhoto;
    followUpPhotos: LocalPhoto[];
    space: string;
    note: string;
    constructions: string[];
    pendingType?: string;
    resolvedAt: Date;
  }>;
}) => {
  // Delegate to parent page to handle Word generation
  // For now, just close the sheet
  showReportSheet.value = false;
};

const handleRequestRemoveRelatedPhoto = (relatedPhoto: PhotoLike) => {
  selectedRelatedPhoto.value = relatedPhoto;
  showRemoveFollowUpConfirm.value = true;
};

const handleConfirmRemoveRelatedPhoto = async () => {
  if (!photo.value || !selectedRelatedPhoto.value) {
    return;
  }

  const parentId = photo.value.id;
  const childPhoto = selectedRelatedPhoto.value;

  try {
    await removeFollowUpPhoto(parentId, childPhoto.id);
    await updatePhotoInIndexedDB(childPhoto.id, {
      isDeleted: true,
      trashedAt: new Date(),
      syncStatus: SyncStatus.PENDING,
      isDirty: true,
    });

    if (childPhoto.synced) {
      await photoApi.sync([
        {
          clientId: childPhoto.id,
          projectId: childPhoto.projectId,
          takenAt: childPhoto.takenAt.toISOString(),
          constructions: childPhoto.constructions,
          space: childPhoto.space,
          status: childPhoto.status,
          pendingType: childPhoto.pendingType,
          note: childPhoto.note,
          reportNote: childPhoto.reportNote,
          parentPhotoId: childPhoto.parentPhotoId,
          relatedPhotoIds: childPhoto.relatedPhotoIds,
          fileBase64: '',
          syncLevel: childPhoto.syncLevel,
          isEvidence: childPhoto.isEvidence,
          isSampled: childPhoto.isSampled,
          isReported: childPhoto.isReported,
          shares: childPhoto.shares as unknown as Record<string, unknown>[],
          deletedAt: new Date().toISOString(),
        },
      ]);
      await updatePhotoInIndexedDB(childPhoto.id, { syncStatus: SyncStatus.DONE, isDirty: false });
    }

    selectedRelatedPhoto.value = null;
    showRemoveFollowUpConfirm.value = false;

    await updatePhotoInIndexedDB(parentId, {
      relatedPhotoIds: (photo.value.relatedPhotoIds || []).filter((id) => id !== childPhoto.id),
    });

    relatedPhotos.value = relatedPhotos.value.filter((p) => p.id !== childPhoto.id);
    await updatePhotoCount();
  } catch (error) {
    console.error('[PhotoEdit] Failed to remove follow-up photo:', error);
  }
};

const handleDiscard = async (evidenceAction?: EvidenceAction) => {
  if (!photo.value) {
    return;
  }

  const photoId = photo.value.id;
  const isEvidence = photo.value.isEvidence;
  const isSynced = photo.value.synced;

  try {
    // Clean up blob URL from PhotoEditForm to release memory
    if (formRef.value) {
      formRef.value.cleanupPhotoUrl();
    }

    // Clear photo data immediately
    photo.value = null;

    // For evidence photos (Layer 2-3), handle based on evidenceAction
    if (isEvidence && evidenceAction === EvidenceAction.Trash) {
      // Soft delete with trashedAt for 30-day recovery
      await updatePhotoInIndexedDB(photoId, { isDeleted: true, trashedAt: new Date() });
    } else {
      // Permanent delete or regular photo
      await updatePhotoInIndexedDB(photoId, { isDeleted: true });

      // For synced evidence photos, permanently delete from cloud
      if (isEvidence && isSynced) {
        const success = await deletePhotoByClientId(photoId);
        if (!success) {
          console.error(`[PhotoEdit] Failed to delete photo ${photoId} from cloud`);
        }
      }
    }

    // Update photo count
    await updatePhotoCount();

    // Return to timeline
    router.push('/mobile/timeline');
  } catch (error) {
    console.error(`[PhotoEdit] Failed to delete photo ${photoId}:`, error);
    // Optionally show user feedback here
  }
};

const handleCancel = () => {
  router.push('/mobile/timeline');
};

const handleFinalConfirm = async () => {
  if (!photo.value || !formRef.value) {
    return;
  }

  const photoId = photo.value.id;

  try {
    const formData = formRef.value.getFormData();

    // Check if photo needs sync (Layer 2 or Layer 3)
    const needsSync =
      photo.value.syncLevel === PhotoSyncLevel.THUMBNAIL ||
      photo.value.syncLevel === PhotoSyncLevel.EVIDENCE ||
      photo.value.isEvidence;

    // Update photo metadata in IndexedDB
    await updatePhotoInIndexedDB(photoId, {
      constructions: formData.constructions,
      space: formData.space,
      status: formData.status,
      pendingType: formData.pendingType,
      note: formData.note,
      ...(needsSync && {
        syncStatus: SyncStatus.PENDING,
        isDirty: true,
      }),
    });

    // For Layer 2/3 photos, sync immediately to cloud
    if (needsSync) {
      const updatePayload = {
        clientId: photoId,
        note: formData.note,
        reportNote: photo.value.reportNote,
        space: formData.space || undefined,
        status: formData.status,
        pendingType: formData.pendingType,
        constructions: formData.constructions,
        parentPhotoId: photo.value.parentPhotoId,
        relatedPhotoIds: photo.value.relatedPhotoIds,
      };

      const response = await photoApi.updateBatch([updatePayload]);

      if (response.success && response.data) {
        const result = response.data.results[0];
        if (result.success) {
          await updatePhotoInIndexedDB(photoId, {
            isDirty: false,
            syncStatus: SyncStatus.DONE,
          });
        }
      }
    }

    // Return to previous page after successful save
    const from = route.query.from as string;
    if (from === 'pending') {
      router.push('/mobile/pending');
    } else {
      router.push('/mobile/timeline');
    }
  } catch (error) {
    console.error(`[PhotoEdit] Failed to update photo ${photoId}:`, error);
    // Optionally show user feedback here
  }
};

/**
 * Load photo from IndexedDB by ID
 * If photo not found or error occurs, navigate back
 */
const loadPhoto = async (photoId: string) => {
  if (!photoId) {
    router.back();
    return;
  }

  isLoading.value = true;
  try {
    const loadedPhoto = await getPhotoFromIndexedDB(photoId);
    if (loadedPhoto) {
      // Fix: If the photo is already evidence/resolved but resolvedAt is missing,
      // keep the evidence chain visible by deriving a display timestamp.
      if (
        !loadedPhoto.resolvedAt &&
        (loadedPhoto.status === PhotoStatus.RESOLVED || loadedPhoto.isEvidence)
      ) {
        loadedPhoto.resolvedAt = loadedPhoto.updatedAt;
      }

      // Fix: If photo has resolvedAt but status is pending, set status to resolved
      // This handles the case where sync logic overwrites local resolved status with remote pending status
      if (loadedPhoto.resolvedAt && loadedPhoto.status === PhotoStatus.PENDING) {
        await updatePhotoInIndexedDB(photoId, {
          status: PhotoStatus.RESOLVED,
        });
        loadedPhoto.status = PhotoStatus.RESOLVED;
      }
      photo.value = loadedPhoto;
      await loadRelatedPhotos(loadedPhoto);
    } else {
      router.back();
    }
  } catch (error) {
    console.error(`[PhotoEdit] Failed to load photo ${photoId}:`, error);
    router.back();
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  const photoId = route.params.id as string;
  loadPhoto(photoId);
});

// Watch for route parameter changes
watch(
  () => route.params.id,
  (newPhotoId) => {
    if (newPhotoId) {
      loadPhoto(newPhotoId as string);
    }
  }
);

const { finalizeLayer3Photos } = useFollowUpPhotoFlow();

const selectAlbumImport = () => {
  showFollowUpDialog.value = false;
  followUpFileInput.value?.click();
};

const selectCameraCapture = () => {
  if (!photo.value) return;
  showFollowUpDialog.value = false;
  router.push({
    name: 'camera',
    query: {
      parentPhotoId: photo.value.id,
      source: 'photo-edit',
    },
  });
};

const handleFollowUpFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!photo.value || !input.files || input.files.length === 0) return;

  const parentId = photo.value.id;
  const projectId = photo.value.projectId;
  const files = Array.from(input.files);
  input.value = '';

  const createdIds: string[] = [];
  for (const file of files) {
    try {
      const compressedBlob = await compressImage(file, 1280, 0.9);
      const now = new Date(file.lastModified);
      const id = uuidv4();
      const newPhoto: LocalPhoto = {
        id,
        file: compressedBlob,
        takenAt: now,
        projectId,
        constructions: [],
        space: null,
        status: PhotoStatus.NORMAL,
        pendingType: null,
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
        parentPhotoId: parentId,
        relatedPhotoIds: [],
        shares: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await savePhotoToIndexedDB(newPhoto);
      await addFollowUpPhoto(parentId, id);
      createdIds.push(id);
    } catch (e) {
      console.warn('Failed to import follow-up file:', e);
    }
  }

  if (createdIds.length > 0) {
    try {
      await finalizeLayer3Photos([parentId, ...createdIds], parentId);
      // Reload the parent photo to get the latest state including resolvedAt
      await loadPhoto(parentId);
    } catch (e) {
      console.warn('Failed to finalize follow-up photos:', e);
    }
  }

  showFollowUpDialog.value = false;
};
</script>

<style scoped lang="scss">
textarea {
  resize: vertical;
}
</style>
