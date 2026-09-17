<template>
  <div class="flex flex-col">
    <MobileHeader :title="t('title.trash')">
      <template #center>
        <ProjectSelector
          variant="timeline"
          menu-container-class="fixed left-1/2 -translate-x-1/2 top-16 z-50 max-h-96 min-w-60 overflow-hidden rounded-lg bg-white shadow-lg"
        />
      </template>
      <template #right>
        <router-link to="/mobile/timeline" class="rounded-lg p-2 text-gray-600 hover:bg-gray-100">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        </router-link>
      </template>
    </MobileHeader>
    <div class="flex-shrink-0 bg-white px-4 py-2">
      <p class="text-sm text-brand-primary">
        {{ t('trash.bin.imageCount', { count: imageCount }) }}
      </p>
      <p class="text-xs text-gray-500">{{ t('trash.bin.retentionInfo') }}</p>
    </div>

    <div class="mobile-page-container flex flex-col">
      <div v-if="trashError" class="flex flex-1 items-center justify-center">
        <p class="text-red-500">{{ trashError }}</p>
      </div>

      <div
        v-else-if="trashPhotos.length === 0"
        class="flex min-h-[calc(100vh-250px)] flex-col items-center justify-center"
      >
        <EmptyStatePlaceholder :message="t('trash.status.emptyTrash')" />
      </div>

      <div v-else class="flex-1 overflow-y-auto">
        <div class="grid grid-cols-3 gap-4">
          <PhotoCard
            v-for="photo in trashPhotos"
            :key="photo.id"
            :photo="photo"
            :is-selected="selectedPhotos.has(photo.id)"
            :is-multi-select-mode="isMultiSelectMode"
            :remaining-days="getRemainingDays(photo.trashedAt)"
            :show-sync-status="false"
            @click="handlePhotoClick(photo)"
            @touchstart="handlePhotoTouchStart(photo)"
            @touchend="handlePhotoTouchEnd"
            @mousedown="handlePhotoMouseDown(photo)"
            @mouseup="handlePhotoMouseUp"
          />
        </div>
      </div>
    </div>

    <TrashBatchActionBar
      v-if="isMultiSelectMode"
      :is-visible="isMultiSelectMode"
      :count="selectedPhotos.size"
      :is-disabled="isDeleting"
      @cancel="handleClearSelection"
      @restore="handleBatchRestore"
      @permanent-delete="handleBatchPermanentDelete"
    />

    <Loading v-if="isDeleting" class="absolute inset-0 z-50" />

    <DeleteDialog
      v-model="showDeleteConfirm"
      :target="t('trash.bin.photos')"
      :subject="t('trash.bin.delete')"
      :additional-info="deleteConfirmMessage"
      @confirm="handleDeleteConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, onActivated, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LocalPhoto } from '@/types/photo';

import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import EmptyStatePlaceholder from '@/components/core/EmptyStatePlaceholder.vue';
import MobileHeader from '@/components/core/header/MobileHeader.vue';
import Loading from '@/components/core/loading/Loading.vue';
import ProjectSelector from '@/components/project/ProjectSelector.vue';
import PhotoCard from '@/components/timeline/PhotoCard.vue';
import TrashBatchActionBar from '@/components/trash/TrashBatchActionBar.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { useTrash } from '@/composables/useTrash';
import { getAllPhotosFromIndexedDB } from '@/utils/indexedDB';

const {
  trashPhotos,
  trashError,
  isDeleting,
  loadTrashPhotos,
  restorePhoto,
  batchPermanentDeleteTrash,
} = useTrash();

const currentProjectStore = useCurrentProject();
const { currentProjectId } = storeToRefs(currentProjectStore);
const { t } = useI18n();

const selectedPhotos = ref<Set<string>>(new Set());
const isMultiSelectMode = ref(false);
const showDeleteConfirm = ref(false);
const deleteConfirmMessage = ref('');

const lastClickTime = ref(0);
const CLICK_THRESHOLD = 300;

const RETENTION_DAYS = 30;

const imageCount = computed(() => {
  return trashPhotos.value.filter((photo) => photo.file.type.startsWith('image/')).length;
});

const getRemainingDays = (trashedAt?: Date): string => {
  if (!trashedAt) return '30';
  const trashedTime = new Date(trashedAt).getTime();
  const now = Date.now();
  const daysSinceTrashed = Math.floor((now - trashedTime) / (1000 * 60 * 60 * 24));
  const remainingDays = RETENTION_DAYS - daysSinceTrashed;
  return remainingDays > 0 ? remainingDays.toString() : '0';
};

const loadPhotos = () => {
  loadTrashPhotos(currentProjectId.value);
};

onMounted(() => {
  loadPhotos();
});

// Reload trash photos when page is activated (e.g., when navigating back to this page)
onActivated(() => {
  loadPhotos();
});

watch(currentProjectId, () => {
  handleClearSelection();
  loadPhotos();
});

const handlePhotoClick = (photo: LocalPhoto) => {
  const now = Date.now();
  const timeDiff = now - lastClickTime.value;

  if (timeDiff < CLICK_THRESHOLD) {
    if (!isMultiSelectMode.value) {
      isMultiSelectMode.value = true;
    }
    togglePhotoSelection(photo.id);
  } else {
    if (isMultiSelectMode.value) {
      togglePhotoSelection(photo.id);
    }
  }

  lastClickTime.value = now;
};

const handlePhotoTouchStart = (_photo: LocalPhoto) => {
  lastClickTime.value = Date.now();
};

const handlePhotoTouchEnd = () => {
  const now = Date.now();
  const timeDiff = now - lastClickTime.value;

  if (timeDiff < CLICK_THRESHOLD && !isMultiSelectMode.value) {
    isMultiSelectMode.value = true;
  }
};

const handlePhotoMouseDown = (_photo: LocalPhoto) => {
  lastClickTime.value = Date.now();
};

const handlePhotoMouseUp = () => {
  const now = Date.now();
  const timeDiff = now - lastClickTime.value;

  if (timeDiff < CLICK_THRESHOLD && !isMultiSelectMode.value) {
    isMultiSelectMode.value = true;
  }
};

const togglePhotoSelection = (photoId: string) => {
  if (selectedPhotos.value.has(photoId)) {
    selectedPhotos.value.delete(photoId);
  } else {
    selectedPhotos.value.add(photoId);
  }

  if (selectedPhotos.value.size === 0) {
    isMultiSelectMode.value = false;
  }
};

const handleClearSelection = () => {
  selectedPhotos.value.clear();
  isMultiSelectMode.value = false;
};

const handleBatchRestore = async () => {
  const photoIds = Array.from(selectedPhotos.value);
  for (const photoId of photoIds) {
    const success = await restorePhoto(photoId);
    if (!success) {
      console.error(t('trash.bin.restoreFailed'), photoId);
    }
  }
  handleClearSelection();
};

const handleDeleteConfirm = () => {
  const selectedPhotosList = trashPhotos.value.filter((p) => selectedPhotos.value.has(p.id));
  batchPermanentDeleteTrash(selectedPhotosList, currentProjectId.value)
    .then((result) => {
      if (result.failed > 0) {
        console.error(t('trash.bin.deleteFailed'));
      }
      handleClearSelection();
    })
    .catch((error) => {
      console.error(t('trash.bin.deleteFailed'), error);
    });
};

const handleBatchPermanentDelete = async () => {
  const selectedPhotosList = trashPhotos.value.filter((p) => selectedPhotos.value.has(p.id));

  const allPhotos = await getAllPhotosFromIndexedDB();
  let totalFollowUpCount = 0;
  for (const photo of selectedPhotosList) {
    const followUpCount = allPhotos.filter((p) => p.parentPhotoId === photo.id).length;
    totalFollowUpCount += followUpCount;
  }

  if (totalFollowUpCount > 0) {
    deleteConfirmMessage.value = t('trash.bin.delete_with_follow_up', {
      count: totalFollowUpCount,
    });
    showDeleteConfirm.value = true;
  } else {
    await batchPermanentDeleteTrash(selectedPhotosList, currentProjectId.value);
    handleClearSelection();
  }
};
</script>
