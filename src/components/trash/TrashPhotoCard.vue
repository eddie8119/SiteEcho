<template>
  <div
    class="group relative cursor-pointer overflow-hidden bg-white shadow transition-all hover:shadow-lg"
    @click="$emit('click', photo)"
  >
    <img :src="photo.thumbnailUrl || photo.imageUrl" alt="" class="h-40 w-full object-cover" />

    <!-- Checkbox in multi-select mode -->
    <div v-if="isMultiSelectMode" class="absolute right-2 top-2">
      <div
        class="flex h-6 w-6 items-center justify-center rounded-full border-2"
        :class="isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'"
      >
        <svg v-if="isSelected" class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path
            fill-rule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clip-rule="evenodd"
          />
        </svg>
      </div>
    </div>

    <!-- Remaining days badge -->
    <div class="absolute bottom-0 left-0 w-full rounded-b bg-gray-600/70 px-2 py-1">
      <p class="text-center text-xs text-white">
        {{ t('trash.card.remainingDays', { days: remainingDays }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { PhotoRecord } from '@/types/photo';

const props = defineProps<Props>();

defineEmits<{
  click: [photo: PhotoRecord];
}>();

const { t } = useI18n();

interface Props {
  photo: PhotoRecord;
  isSelected: boolean;
  isMultiSelectMode: boolean;
}

const RETENTION_DAYS = 30;

const remainingDays = computed(() => {
  if (!props.photo.deletedAt) return '30';
  const deletedTime = new Date(props.photo.deletedAt).getTime();
  const now = Date.now();
  const daysSinceDeleted = Math.floor((now - deletedTime) / (1000 * 60 * 60 * 24));
  const daysRemaining = RETENTION_DAYS - daysSinceDeleted;
  return daysRemaining > 0 ? daysRemaining.toString() : '0';
});
</script>
