<template>
  <div class="desktop-trash-page flex h-full overflow-hidden bg-gray-50">
    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto bg-gray-50 p-8">
      <div class="mx-auto max-w-5xl">
        <div class="mb-8 flex items-center justify-between">
          <div class="flex flex-col gap-2">
            <div>
              <H1Title :title="t('trash.header.title')" />
              <p class="mt-1 text-sm text-gray-500">
                {{ t('trash.header.photoCountPrefix') }}
                {{ t('trash.header.photoCount', { count: filteredTrashPhotos.length }) }} ·
                {{ t('trash.header.retentionInfo') }}
              </p>
            </div>
            <RefreshButton class="max-w-fit" :is-loading="isDeleting" @click="loadTrashPhotos" />
          </div>

          <div class="flex gap-2">
            <TextButton v-if="isMultiSelectMode" variant="ghost" size="sm" @click="selectAllPhotos">
              {{ t('trash.buttons.selectAll') }}
            </TextButton>
            <TextButton
              :variant="isMultiSelectMode ? 'primary' : 'primary'"
              size="sm"
              @click="toggleMultiSelectMode"
            >
              {{ isMultiSelectMode ? t('trash.buttons.exitBatch') : t('trash.buttons.batchEdit') }}
            </TextButton>
            <TextButton
              v-if="filteredTrashPhotos.length > 0 && !isMultiSelectMode"
              variant="ghost"
              size="sm"
              @click="handleEmptyTrash"
            >
              {{ t('trash.buttons.emptyTrash') }}
            </TextButton>
          </div>
        </div>

        <!-- Error State -->
        <div
          v-if="trashError"
          class="flex h-80 flex-col items-center justify-center rounded-2xl bg-white p-12 text-center"
        >
          <p class="text-red-500">{{ trashError }}</p>
          <TextButton class="mt-4" variant="primary" size="sm" @click="loadTrashPhotos">
            {{ t('trash.buttons.retry') }}
          </TextButton>
        </div>

        <!-- Empty State -->
        <div
          v-else-if="filteredTrashPhotos.length === 0"
          class="flex h-80 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 bg-white p-12 text-center"
        >
          <EmptyStatePlaceholder :message="t('trash.status.emptyTrash')" :icon-size="40" />
        </div>

        <!-- Trash Photos Timeline -->
        <TrashPhotosTimeline
          v-if="filteredTrashPhotos.length > 0"
          :grouped-photos="groupedPhotos"
          :selected-photo-ids="selectedPhotoIds"
          :is-multi-select-mode="isMultiSelectMode"
          :selected-project-id="selectedProjectId"
          @photo-click="handlePhotoClick"
        />
      </div>
    </div>

    <!-- Batch Action Bar -->
    <BatchActionBar
      :is-visible="hasSelectedPhotos"
      :count="selectedPhotosCount"
      :summary="selectedPhotosSummary"
      :is-disabled="isDeleting"
      @cancel="toggleMultiSelectMode"
      @restore="handleBatchRestore"
      @delete="handleBatchPermanentDelete"
    />

    <!-- Loading Overlay -->
    <Loading v-if="isDeleting" class="absolute inset-0 z-50" />

    <!-- Empty Trash Dialog -->
    <DeleteDialog
      v-model="showEmptyTrashDialog"
      :target="t('trash.header.title')"
      :body-text="t('trash.dialog.emptyTrashConfirm')"
      @confirm="handleConfirmEmptyTrash"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import type { PhotoRecord } from '@/types/photo';

import RefreshButton from '@/components/core/button/RefreshButton.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import EmptyStatePlaceholder from '@/components/core/EmptyStatePlaceholder.vue';
import Loading from '@/components/core/loading/Loading.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import BatchActionBar from '@/components/timeline/TrashBatchActionBarWeb.vue';
import TrashPhotosTimeline from '@/components/trash/TrashPhotosTimeline.vue';
import { useProjects } from '@/composables/query/useProjects';
import { useWebTrash } from '@/composables/useWebTrash';
import { formatDate } from '@/utils/date';

const { t } = useI18n();

const {
  trashPhotos,
  trashError,
  isDeleting,
  loadTrashPhotos,
  restorePhotos,
  permanentDeletePhotos,
  emptyTrash,
} = useWebTrash();

const route = useRoute();
const { fetchedProjects: projects } = useProjects();

// Get selected project from route query
const selectedProjectId = computed(() => route.query.projectId as string | undefined);

// Filter trash photos based on selected project
const filteredTrashPhotos = computed(() => {
  if (!selectedProjectId.value) {
    return trashPhotos.value;
  }
  return trashPhotos.value.filter((photo) => photo.projectId === selectedProjectId.value);
});

// Get project name by clientId
const getProjectName = (clientId: string): string => {
  const project = projects.value?.find((p) => p.clientId === clientId);
  return project?.name || t('trash.status.unknownProject');
};

// Batch selection state
const selectedPhotoIds = ref<Set<string>>(new Set());
const isMultiSelectMode = ref(false);

// Empty trash dialog state
const showEmptyTrashDialog = ref(false);

onActivated(() => {
  loadTrashPhotos();
});

const handlePhotoClick = (photo: PhotoRecord) => {
  if (isMultiSelectMode.value) {
    // Toggle selection in multi-select mode
    if (selectedPhotoIds.value.has(photo.id)) {
      selectedPhotoIds.value.delete(photo.id);
    } else {
      selectedPhotoIds.value.add(photo.id);
    }
  }
};

const toggleMultiSelectMode = () => {
  isMultiSelectMode.value = !isMultiSelectMode.value;
  if (!isMultiSelectMode.value) {
    selectedPhotoIds.value.clear();
  }
};

const selectAllPhotos = () => {
  filteredTrashPhotos.value.forEach((photo) => {
    selectedPhotoIds.value.add(photo.id);
  });
};

const selectedPhotosCount = computed(() => selectedPhotoIds.value.size);
const hasSelectedPhotos = computed(() => selectedPhotosCount.value > 0);

const selectedPhotos = computed(() => {
  return filteredTrashPhotos.value.filter((photo) => selectedPhotoIds.value.has(photo.id));
});

const selectedPhotosSummary = computed(() => {
  const photos = selectedPhotos.value;
  if (photos.length === 0) return '';
  return t('trash.selection.selectedSummary', { count: photos.length });
});

const handleBatchRestore = async () => {
  const photoIds = Array.from(selectedPhotoIds.value);
  const result = await restorePhotos(photoIds);
  if (result.success > 0) {
    selectedPhotoIds.value.clear();
    isMultiSelectMode.value = false;
  }
};

const handleBatchPermanentDelete = async () => {
  const photosToDelete = selectedPhotos.value;
  const result = await permanentDeletePhotos(photosToDelete);
  if (result.success > 0) {
    selectedPhotoIds.value.clear();
    isMultiSelectMode.value = false;
  }
};

const handleEmptyTrash = () => {
  showEmptyTrashDialog.value = true;
};

const handleConfirmEmptyTrash = async () => {
  const result = await emptyTrash();
  if (result.success > 0) {
    showEmptyTrashDialog.value = false;
  }
};

const groupedPhotos = computed(() => {
  const grouped: Record<string, PhotoRecord[]> = {};
  const now = new Date();
  const todayKey = formatDate(now);

  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = formatDate(yesterdayDate);

  filteredTrashPhotos.value.forEach((photo: PhotoRecord) => {
    const dateKey = formatDate(photo.deletedAt || photo.takenAt);
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(photo);
  });

  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([dateKey, photos]) => {
      let dateLabel = dateKey;
      if (dateKey === todayKey) dateLabel = t('trash.timeline.today');
      else if (dateKey === yesterdayKey) dateLabel = t('trash.timeline.yesterday');

      // Group photos by project within each date
      const projectGroups: Record<string, PhotoRecord[]> = {};
      photos.forEach((photo) => {
        const projectKey = photo.projectId || 'no-project';
        if (!projectGroups[projectKey]) {
          projectGroups[projectKey] = [];
        }
        projectGroups[projectKey].push(photo);
      });

      // Convert project groups to array with project names
      const projectGroupsArray = Object.entries(projectGroups).map(
        ([projectId, projectPhotos]) => ({
          projectId,
          projectName:
            projectId === 'no-project' ? t('trash.status.noProject') : getProjectName(projectId),
          photos: projectPhotos.sort(
            (a: PhotoRecord, b: PhotoRecord) =>
              (b.deletedAt || b.takenAt).getTime() - (a.deletedAt || a.takenAt).getTime()
          ),
        })
      );

      return {
        date: dateKey,
        dateLabel,
        projectGroups: projectGroupsArray,
      };
    });
});
</script>

<style scoped lang="scss">
.desktop-trash-page {
  scrollbar-gutter: stable;
}

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
