<template>
  <div>
    <!-- Date Section Header -->
    <div class="border-b px-2 pb-1 pt-3">
      <h2 class="text-sm font-semibold text-gray-700">{{ dateLabel }}</h2>
    </div>

    <!-- Photo Grid - 3 Columns -->
    <div class="grid grid-cols-3 gap-1 p-1 md:grid-cols-5">
      <PhotoCard
        v-for="photo in photos"
        :key="photo.id"
        :photo="photo"
        :is-selected="selectedPhotos.has(photo.id)"
        :is-multi-select-mode="isMultiSelectMode"
        :show-sync-status="showSyncStatus"
        :follow-up-photos="followUpPhotosByParentId?.[photo.id] || []"
        @click="emit('photo-click', photo)"
        @touchstart="emit('photo-touchstart', photo)"
        @touchend="emit('photo-touchend')"
        @mousedown="emit('photo-mousedown', photo)"
        @mouseup="emit('photo-mouseup')"
        @space-click="emit('space-click', $event)"
        @construction-click="emit('construction-click', $event)"
        @show-all-constructions="emit('show-all-constructions', $event)"
        @toggle-evidence="handleToggleEvidence"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import PhotoCard from './PhotoCard.vue';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

defineProps<{
  dateLabel: string;
  photos: LocalPhoto[] | PhotoRecord[];
  selectedPhotos: Set<string>;
  isMultiSelectMode: boolean;
  showSyncStatus?: boolean;
  followUpPhotosByParentId?: Record<string, Array<LocalPhoto | PhotoRecord>>;
}>();

const emit = defineEmits<{
  'photo-click': [photo: LocalPhoto | PhotoRecord];
  'photo-touchstart': [photo: LocalPhoto | PhotoRecord];
  'photo-touchend': [];
  'photo-mousedown': [photo: LocalPhoto | PhotoRecord];
  'photo-mouseup': [];
  'space-click': [space: string];
  'construction-click': [construction: string];
  'show-all-constructions': [constructions: string[]];
  'toggle-evidence': [photo: LocalPhoto | PhotoRecord];
}>();

const handleToggleEvidence = (photo: LocalPhoto | PhotoRecord) => {
  emit('toggle-evidence', photo);
};
</script>
