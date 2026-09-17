<template>
  <BasePhotosTimeline :grouped-photos="groupedPhotos" :selected-project-id="selectedProjectId">
    <template #photo-card="{ photo }">
      <TrashPhotoCard
        :photo="photo"
        :is-selected="selectedPhotoIds.has(photo.id)"
        :is-multi-select-mode="isMultiSelectMode"
        @click="$emit('photo-click', photo)"
      />
    </template>
  </BasePhotosTimeline>
</template>

<script setup lang="ts">
import type { GroupedPhotosByProject, PhotoRecord } from '@/types/photo';

import BasePhotosTimeline from '@/components/photo/BasePhotosTimeline.vue';
import TrashPhotoCard from '@/components/trash/TrashPhotoCard.vue';

defineProps<{
  groupedPhotos: GroupedPhotosByProject[];
  selectedPhotoIds: Set<string>;
  isMultiSelectMode: boolean;
  selectedProjectId?: string;
}>();

defineEmits<{
  'photo-click': [photo: PhotoRecord];
}>();
</script>
