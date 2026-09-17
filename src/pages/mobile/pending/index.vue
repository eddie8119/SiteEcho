<template>
  <div class="mobile-page-container safe-area-top-lg">
    <!-- Project Header -->
    <div class="mb-6 flex items-center justify-between">
      <H3Title :title="t('title.pending_photos')" />
      <ProjectSelector />
    </div>

    <div
      class="flex h-full flex-col"
      :class="{ 'min-h-[calc(100dvh-200px)] justify-center': pendingPhotos.length === 0 }"
    >
      <EmptyStatePlaceholder
        v-if="pendingPhotos.length === 0"
        :message="t('message.no_pending_photos')"
      />
      <PendingPhotosWithFilter
        v-else
        :photos="pendingPhotos"
        :open-bottom-sheet-for-id="openBottomSheetForId"
        @mark-resolved="handleMarkResolved"
        @mark-resolved-with-after-photo="handleMarkResolvedWithAfterPhoto"
      />
    </div>
  </div>

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
    @select-album="handleSelectAlbumImport"
    @select-camera="handleSelectCamera"
    @cancel="handleFollowUpDialogCancel"
  />

  <!-- Registration Prompt -->
  <RegisterPromptSheet
    v-model="showRegisterPrompt"
    :reason="promptReason"
    :photo-count="photoCount"
    @login="redirectToLogin"
  />
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { computed, nextTick, onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import type { LocalPhoto } from '@/types/photo';

import RegisterPromptSheet from '@/components/auth/RegisterPromptSheet.vue';
import EmptyStatePlaceholder from '@/components/core/EmptyStatePlaceholder.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import PendingPhotosWithFilter from '@/components/pending/PendingPhotosWithFilter.vue';
import FollowUpSourceDialog from '@/components/photo/FollowUpSourceDialog.vue';
import ProjectSelector from '@/components/project/ProjectSelector.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { useFollowUpPhotoFlow } from '@/composables/useFollowUpPhotoFlow';
import { useFollowUpPhotoRelations } from '@/composables/useFollowUpPhotoRelations';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { PhotoStatus, PhotoSyncLevel, SyncStatus, UpdateSource } from '@/types/photo';
import { compressImage } from '@/utils/imageCompression';
import { getAllPhotosFromIndexedDB, savePhotoToIndexedDB } from '@/utils/indexedDB';

const store = useCurrentProject();
const currentProjectId = computed(() => store.currentProjectId);
const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const {
  stageResolvedForFollowUp,
  finalizeResolvedPhoto,
  finalizeLayer3Photos,
  restoreFollowUpDraft,
} = useFollowUpPhotoFlow();
const { addFollowUpPhoto } = useFollowUpPhotoRelations();

const { showRegisterPrompt, promptReason, photoCount, redirectToLogin } = useRegistrationFlow();

const allPhotos = ref<LocalPhoto[]>([]);

const showFollowUpDialog = ref(false);
const followUpParentId = ref<string | null>(null);
const followUpFileInput = ref<HTMLInputElement | null>(null);

// Check if we need to open bottom sheet for a specific photo (undo flow)
const openBottomSheetForId = computed(() => {
  const value = route.query.openBottomSheet;
  return typeof value === 'string' && value.length > 0 ? value : null;
});

// Computed property for filtered pending photos based on current project
const pendingPhotos = computed(() => {
  let photos = allPhotos.value.filter(
    (photo) => photo.status === PhotoStatus.PENDING && !photo.parentPhotoId
  );

  // Filter by current project if one is selected
  if (currentProjectId.value) {
    photos = photos.filter((photo) => photo.projectId === currentProjectId.value);
  }

  return photos;
});

const loadAllPhotos = async () => {
  try {
    const photos = await getAllPhotosFromIndexedDB();
    allPhotos.value = photos;
  } catch (error) {
    console.error('Failed to load photos:', error);
  }
};

const handleMarkResolvedWithAfterPhoto = async (photoId: string) => {
  const success = await stageResolvedForFollowUp(photoId);
  if (!success) return;

  followUpParentId.value = photoId;
  showFollowUpDialog.value = true;
};

const handleMarkResolved = async (photoId: string) => {
  try {
    const success = await finalizeResolvedPhoto(photoId);
    if (!success) return;

    // Reload all photos to reflect the change
    await loadAllPhotos();
  } catch (error) {
    console.error('Failed to mark photo as resolved:', error);
  }
};

onMounted(() => {
  loadAllPhotos();
});

onActivated(async () => {
  await loadAllPhotos();
  // Clear the openBottomSheet query param after handling it
  if (route.query.openBottomSheet) {
    await nextTick();
    router.replace({ query: {} });
  }
});

const handleSelectAlbumImport = () => {
  if (!currentProjectId.value || !followUpParentId.value) {
    showFollowUpDialog.value = false;
    return;
  }
  followUpFileInput.value?.click();
};

const handleSelectCamera = async () => {
  if (!followUpParentId.value) return;
  await router.push({
    name: 'camera',
    query: {
      parentPhotoId: followUpParentId.value,
    },
  });
};

const handleFollowUpFileChange = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) {
    return;
  }
  if (!currentProjectId.value || !followUpParentId.value) {
    input.value = '';
    return;
  }

  const parentId = followUpParentId.value;
  const files = Array.from(input.files);
  input.value = '';

  const createdIds: string[] = [];
  for (const file of files) {
    try {
      const compressedBlob = await compressImage(file, 1280, 0.9);
      const now = new Date(file.lastModified);
      const id = uuidv4();
      const photo: LocalPhoto = {
        id,
        file: compressedBlob,
        takenAt: now,
        projectId: currentProjectId.value,
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
      await savePhotoToIndexedDB(photo);
      await addFollowUpPhoto(parentId, id);
      createdIds.push(id);
    } catch (e) {
      console.warn('Failed to import follow-up file:', e);
    }
  }

  if (createdIds.length > 0) {
    try {
      await finalizeLayer3Photos([parentId, ...createdIds], parentId);
    } catch (e) {
      console.warn('Failed to finalize follow-up photos:', e);
    }
  }

  await loadAllPhotos();
  showFollowUpDialog.value = false;
};

const handleFollowUpDialogCancel = async () => {
  if (followUpParentId.value) {
    try {
      await restoreFollowUpDraft(followUpParentId.value, [], { restoreParent: true });
    } catch (e) {
      console.warn('Failed to restore follow-up draft on cancel:', e);
    }
  }
  showFollowUpDialog.value = false;
  followUpParentId.value = null;
};
</script>

<style scoped lang="scss">
/* Safe area is now handled in MobileLayout, no need for duplicate handling here */
</style>
