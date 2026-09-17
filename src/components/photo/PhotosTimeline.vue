<template>
  <BasePhotosTimeline :grouped-photos="groupedPhotos" :selected-project-id="selectedProjectId">
    <template #photo-card="{ photo }">
      <PhotoCard
        :photo="photo"
        :is-selected="selectedPhotoIds.has(photo.id)"
        :is-multi-select-mode="isMultiSelectMode"
        :follow-up-photos="followUpPhotosByParentId[photo.id] || []"
        @click="$emit('photo-click', photo)"
        @show-all-constructions="showConstructionsDialog"
      />
    </template>
  </BasePhotosTimeline>

  <ConstructionsDialog
    v-model="showAllConstructionsDialog"
    :constructions="currentConstructions"
    @close="showAllConstructionsDialog = false"
  />
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { GroupedPhotos, GroupedPhotosByProject, PhotoRecord } from '@/types/photo';

import ConstructionsDialog from '@/components/core/dialog/ConstructionsDialog.vue';
import BasePhotosTimeline from '@/components/photo/BasePhotosTimeline.vue';
import PhotoCard from '@/components/timeline/PhotoCard.vue';

interface Props {
  groupedPhotos: (GroupedPhotos | GroupedPhotosByProject)[];
  selectedPhotoIds?: Set<string>;
  isMultiSelectMode?: boolean;
  selectedProjectId?: string;
}

interface Emits {
  (e: 'photo-click', photo: PhotoRecord): void;
}

const props = withDefaults(defineProps<Props>(), {
  selectedPhotoIds: () => new Set(),
  isMultiSelectMode: false,
});

defineEmits<Emits>();

const showAllConstructionsDialog = ref(false);
const currentConstructions = ref<string[]>([]);

const followUpPhotosByParentId = computed<Record<string, PhotoRecord[]>>(() => {
  const grouped: Record<string, PhotoRecord[]> = {};

  const pushPhoto = (photo: PhotoRecord) => {
    if (!photo.parentPhotoId) return;

    if (!grouped[photo.parentPhotoId]) {
      grouped[photo.parentPhotoId] = [];
    }

    grouped[photo.parentPhotoId].push(photo);
  };

  props.groupedPhotos.forEach((group) => {
    if ('photos' in group) {
      group.photos.forEach(pushPhoto);
      return;
    }

    group.projectGroups.forEach((projectGroup) => {
      projectGroup.photos.forEach(pushPhoto);
    });
  });

  return grouped;
});

const showConstructionsDialog = (constructions: string[]) => {
  currentConstructions.value = constructions;
  showAllConstructionsDialog.value = true;
};
</script>
