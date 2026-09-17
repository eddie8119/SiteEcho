<template>
  <div class="space-y-10">
    <div v-for="group in groupedPhotos" :key="group.date" class="relative">
      <div class="sticky top-0 z-10 mb-4 flex items-center bg-gray-50/80 py-2 backdrop-blur-sm">
        <div
          class="mr-4 flex h-8 items-center rounded-full border border-gray-100 bg-white px-4 text-sm font-bold text-gray-900 shadow-sm"
        >
          {{ group.dateLabel }}
        </div>
        <div class="h-px flex-1 bg-gray-200" />
        <div class="ml-4 text-xs font-medium tracking-wider text-gray-400">
          {{ getPhotoCount(group) }} {{ $t('photo.timeline.photos') }}
        </div>
      </div>

      <!-- 當有選擇專案時，直接顯示照片（可選功能） -->
      <slot v-if="selectedProjectId && 'photos' in group" name="direct-photos" :group="group">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          <slot
            v-for="photo in (group as GroupedPhotos).photos"
            :key="photo.id"
            :photo="photo"
            name="photo-card"
          />
        </div>
      </slot>

      <!-- 當沒有選擇專案時，按專案分群顯示 -->
      <div v-else class="space-y-6">
        <div
          v-for="projectGroup in 'projectGroups' in group
            ? (group as GroupedPhotosByProject).projectGroups
            : []"
          :key="projectGroup.projectId"
          class="relative"
        >
          <div v-if="!selectedProjectId" class="mb-3 flex items-center">
            <div
              class="flex h-6 items-center rounded-md border border-orange-200 bg-orange-50 px-3 text-xs font-semibold text-brand-primary"
            >
              {{ projectGroup.projectName }}
            </div>
          </div>

          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <slot
              v-for="photo in projectGroup.photos"
              :key="photo.id"
              :photo="photo"
              name="photo-card"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GroupedPhotos, GroupedPhotosByProject } from '@/types/photo';

interface Props {
  groupedPhotos: (GroupedPhotos | GroupedPhotosByProject)[];
  selectedProjectId?: string;
}

defineProps<Props>();

const getPhotoCount = (group: GroupedPhotos | GroupedPhotosByProject): number => {
  if ('photos' in group) {
    return group.photos.length;
  }
  return group.projectGroups.reduce((sum, pg) => sum + pg.photos.length, 0);
};
</script>
