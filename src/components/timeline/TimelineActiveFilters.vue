<template>
  <div v-if="hasActiveFilters" class="border-b border-gray-200 px-4 py-3">
    <div class="mx-auto max-w-4xl">
      <div class="flex items-center justify-between">
        <div class="flex flex-wrap gap-2">
          <div
            v-for="filter in activeFilters"
            :key="`${filter.type}-${filter.value}`"
            class="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-sm"
          >
            <span>
              {{ filter.value }}
            </span>
            <button
              class="ml-1 text-gray-400 hover:text-gray-600"
              @click="emit('remove-filter', filter.type)"
            >
              ✕
            </button>
          </div>
        </div>
        <button class="text-sm text-brand-primary hover:text-orange-600" @click="emit('clear-all')">
          {{ t('button.clear_filters') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { PhotoFilterType } from '@/types/filter';

defineProps<{
  activeFilters: Array<{ type: PhotoFilterType; value: string }>;
  hasActiveFilters: boolean;
}>();

const emit = defineEmits<{
  'remove-filter': [type: PhotoFilterType];
  'clear-all': [];
}>();

const { t } = useI18n();
</script>
