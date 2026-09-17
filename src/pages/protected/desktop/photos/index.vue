<template>
  <div class="desktop-photos-page flex h-full overflow-hidden bg-gray-50">
    <PhotosSidebar
      :model-value="{ activeSpaceFilter, showOnlyPending, activePendingTypeFilter }"
      :photos="photos"
      :is-loading-photos="isLoadingPhotos"
      @update:active-space-filter="activeSpaceFilter = $event"
      @update:show-only-pending="showOnlyPending = $event"
      @update:active-pending-type-filter="activePendingTypeFilter = $event"
      @refetch="refetchPhotos"
    />

    <!-- Main Content: Timeline -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900">
              {{ currentFilterName }}
            </h1>
            <p class="mt-1 text-sm text-gray-500">
              {{ t('photo.desktop.page.photo_count', { count: filteredPhotosCount }) }}
            </p>
          </div>
          <div class="flex gap-2">
            <TextButton v-if="isMultiSelectMode" variant="ghost" size="sm" @click="selectAllPhotos">
              {{ t('photo.desktop.page.select_all') }}
            </TextButton>
            <TextButton
              :variant="isMultiSelectMode ? 'primary' : 'primary'"
              size="sm"
              @click="toggleMultiSelectMode"
            >
              {{
                isMultiSelectMode
                  ? t('photo.desktop.page.exit_batch')
                  : t('photo.desktop.page.batch_edit')
              }}
            </TextButton>
          </div>
        </div>

        <!-- Loading State -->
        <Loading v-if="isLoadingPhotos" />

        <!-- Empty State -->
        <div
          v-else-if="groupedPhotos.length === 0"
          class="flex h-80 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center"
        >
          <EmptyStatePlaceholder
            :message="
              showOnlyPending
                ? t('photo.desktop.page.empty_pending')
                : t('photo.desktop.page.empty')
            "
            :icon="Picture"
            :icon-size="64"
          />
        </div>

        <!-- Photos Timeline -->
        <PhotosTimeline
          v-else
          :grouped-photos="groupedPhotos"
          :selected-photo-ids="selectedPhotoIds"
          :is-multi-select-mode="isMultiSelectMode"
          :selected-project-id="projectId"
          @photo-click="handlePhotoClick"
        />
      </div>
    </div>

    <!-- Full Image Preview  -->
    <PhotoPreviewModal
      :selected-photo="selectedPhoto"
      :available-spaces="availableSpaces"
      :is-saving="isUpdatingPhoto"
      :parent-photo="selectedPhotoParent"
      :related-photos="selectedPhotoRelatedPhotos"
      @close="selectedPhoto = null"
      @save="handleSavePhoto"
    />

    <!-- Batch Action Bar -->
    <BatchActionBar
      :is-visible="hasSelectedPhotos"
      :count="selectedPhotosCount"
      :summary="selectedPhotosSummary"
      @cancel="toggleMultiSelectMode"
      @set-space="handleBatchSetSpace"
      @set-construction="handleBatchSetConstruction"
      @download="handleBatchDownload"
      @delete="handleBatchDelete"
    />

    <!-- Batch Space Picker -->
    <BatchAttributePickerSheet
      v-model="showSpacePicker"
      type="space"
      :options="spaceOptions"
      :count="selectedPhotosCount"
      @confirm="handleBatchSpaceConfirm"
      @add-option="handleAddSpaceOption"
      @edit-item="handleEditSpaceOption"
      @delete-item="handleDeleteSpaceOption"
    />

    <!-- Batch Construction Picker -->
    <BatchAttributePickerSheet
      v-model="showConstructionPicker"
      type="construction"
      :options="constructionOptions"
      :count="selectedPhotosCount"
      @confirm="handleBatchConstructionConfirm"
      @add-option="handleAddConstructionOption"
      @edit-item="handleEditConstructionOption"
      @delete-item="handleDeleteConstructionOption"
    />
  </div>
</template>

<script setup lang="ts">
import { Picture } from '@element-plus/icons-vue';
import { computed, onActivated, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import type { PhotoRecord } from '@/types/photo';

import { photoApi } from '@/api/photo';
import TextButton from '@/components/core/button/TextButton.vue';
import PhotoPreviewModal from '@/components/core/dialog/PhotoPreviewModal.vue';
import EmptyStatePlaceholder from '@/components/core/EmptyStatePlaceholder.vue';
import Loading from '@/components/core/loading/Loading.vue';
import PhotosSidebar from '@/components/photo/PhotosSidebar.vue';
import PhotosTimeline from '@/components/photo/PhotosTimeline.vue';
import BatchActionBar from '@/components/timeline/BatchActionBarWeb.vue';
import BatchAttributePickerSheet from '@/components/timeline/BatchAttributePickerSheet.vue';
import { useDesktopBatchOptions } from '@/composables/desktop/useDesktopBatchOptions';
import { useDesktopPhotoFilter } from '@/composables/desktop/useDesktopPhotoFilter';
import { useDesktopPhotos } from '@/composables/query/useDesktopPhotos';
import { usePhotos } from '@/composables/query/usePhoto';
import { useProjects } from '@/composables/query/useProjects';
import { addMetadataToImage } from '@/composables/timeline/useTimelineShare';
import { logError } from '@/utils/logger';

const route = useRoute();
const { t } = useI18n();
const projectId = computed(() => route.query.projectId as string | undefined);
const { photos, isLoadingPhotos, refetchPhotos } = useDesktopPhotos({ projectId });
const { updatePhoto, isUpdatingPhoto } = usePhotos({ projectId });
const { fetchedProjects: projects } = useProjects();

const currentProjectName = computed(() => {
  if (!projectId.value) return t('photo.desktop.page.all_projects');
  const project = projects.value?.find((p) => p.clientId === projectId.value);
  return project?.name || t('photo.desktop.page.all_projects');
});

// Photo preview state
const selectedPhoto = ref<PhotoRecord | null>(null);
const selectedPhotoParent = computed(() => {
  if (!selectedPhoto.value?.parentPhotoId || !photos.value) return null;

  return (
    photos.value.find(
      (photo) =>
        photo.id === selectedPhoto.value?.parentPhotoId ||
        photo.clientId === selectedPhoto.value?.parentPhotoId
    ) || null
  );
});

const selectedPhotoRelatedPhotos = computed(() => {
  const relatedPhotoIds = selectedPhoto.value?.relatedPhotoIds || [];
  if (relatedPhotoIds.length === 0 || !photos.value) return [];

  const photosList = photos.value;
  return relatedPhotoIds
    .map(
      (relatedPhotoId) =>
        photosList.find(
          (photo) => photo.id === relatedPhotoId || photo.clientId === relatedPhotoId
        ) || null
    )
    .filter(
      (photo): photo is PhotoRecord => photo !== null && photo.id !== selectedPhoto.value?.id
    );
});

// Multi-select state
const selectedPhotoIds = ref<Set<string>>(new Set());
const isMultiSelectMode = ref(false);

const toggleMultiSelectMode = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) selectedPhotoIds.value.clear();
};

const deselectAllPhotos = () => {
  selectedPhotoIds.value.clear();
};

const selectedPhotosCount = computed(() => selectedPhotoIds.value.size);
const hasSelectedPhotos = computed(() => selectedPhotosCount.value > 0);

// Photo filter composable
const {
  activeSpaceFilter,
  showOnlyPending,
  activePendingTypeFilter,
  currentFilterName,
  filteredPhotos,
  filteredPhotosCount,
  groupedPhotos,
} = useDesktopPhotoFilter({ photos, projects, projectId });

const selectedPhotos = computed(() =>
  filteredPhotos.value.filter((photo) => selectedPhotoIds.value.has(photo.id))
);

const selectedPhotosSummary = computed(() => {
  const photos = selectedPhotos.value;
  if (photos.length === 0) return '';
  const spaces = new Set(photos.map((p) => p.space).filter(Boolean));
  if (spaces.size === 0) return t('photo.desktop.page.no_space');
  if (spaces.size === 1) return t('photo.desktop.page.space', { space: Array.from(spaces)[0] });
  return t('photo.desktop.page.multiple_spaces', { count: spaces.size });
});

// Batch options composable (CRUD for space/construction + batch confirm)
const {
  showSpacePicker,
  showConstructionPicker,
  spaceOptions,
  constructionOptions,
  initializeOptions,
  handleBatchSetSpace,
  handleBatchSetConstruction,
  handleBatchSpaceConfirm,
  handleBatchConstructionConfirm,
  handleAddSpaceOption,
  handleEditSpaceOption,
  handleDeleteSpaceOption,
  handleAddConstructionOption,
  handleEditConstructionOption,
  handleDeleteConstructionOption,
} = useDesktopBatchOptions({
  selectedPhotos,
  deselectAllPhotos,
  toggleMultiSelectMode,
  updatePhoto,
});

initializeOptions();

onMounted(() => {
  if (route.query.filter === 'pending') {
    showOnlyPending.value = true;
  }
});

onActivated(() => {
  refetchPhotos();
});

const selectAllPhotos = () => {
  filteredPhotos.value.forEach((photo) => {
    selectedPhotoIds.value.add(photo.id);
  });
};

const handlePhotoClick = (photo: PhotoRecord) => {
  if (isMultiSelectMode.value) {
    if (selectedPhotoIds.value.has(photo.id)) {
      selectedPhotoIds.value.delete(photo.id);
    } else {
      selectedPhotoIds.value.add(photo.id);
    }
  } else {
    selectedPhoto.value = photo;
  }
};

const handleBatchDownload = async () => {
  if (selectedPhotos.value.length === 0) return;

  try {
    const localPhotos = await Promise.all(
      selectedPhotos.value.map(async (photo) => {
        const response = await fetch(photo.imageUrl);
        const blob = await response.blob();
        return { ...photo, file: blob };
      })
    );

    const filesWithMetadata = await Promise.all(
      localPhotos.map((photo, index) =>
        addMetadataToImage(
          photo as unknown as Parameters<typeof addMetadataToImage>[0],
          index,
          currentProjectName.value
        )
      )
    );

    for (const file of filesWithMetadata) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }

    deselectAllPhotos();
    toggleMultiSelectMode();
  } catch (error) {
    logError('Download failed:', error, 'DesktopPhotos');
  }
};

const handleBatchDelete = async () => {
  const photoIds = selectedPhotos.value.map((photo) => photo.clientId || photo.id);
  try {
    const response = await photoApi.softDeleteBatch(photoIds);
    if (response.success) {
      await refetchPhotos();
      deselectAllPhotos();
      toggleMultiSelectMode();
    }
  } catch (error) {
    logError('Failed to move photos to trash:', error, 'DesktopPhotos');
  }
};

const handleSavePhoto = async (photo: PhotoRecord) => {
  const result = await updatePhoto(photo.serverId || photo.id, {
    note: photo.note ?? undefined,
    space: photo.space ?? undefined,
    status: photo.status,
    pendingType: photo.pendingType ?? undefined,
    constructions: photo.constructions,
    parentPhotoId: photo.parentPhotoId,
    relatedPhotoIds: photo.relatedPhotoIds,
  });

  if (result) {
    selectedPhoto.value = null;
  }
};

const availableSpaces = computed(() => {
  if (!photos.value) return [];
  const spaces = new Set<string>();
  photos.value.forEach((p: PhotoRecord) => {
    if (p.space) spaces.add(p.space);
  });
  return Array.from(spaces).sort();
});
</script>

<style scoped lang="scss">
.desktop-photos-page {
  scrollbar-gutter: stable;
}

// Custom scrollbar for a cleaner look
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
