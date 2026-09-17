<template>
  <div class="sticky top-14 z-30 border-b border-gray-200 bg-white px-4 py-3">
    <div class="mx-auto flex max-w-4xl gap-3">
      <div class="flex-[3]">
        <SearchBar
          :model-value="searchText"
          :placeholder="t('timeline.search_placeholder')"
          @update:model-value="emit('update-search-text', $event)"
        />
      </div>

      <div class="flex flex-none items-center justify-end gap-2 whitespace-nowrap">
        <button
          class="inline-flex min-w-fit items-center gap-2 rounded-lg border p-2 transition-colors"
          :class="{
            'border-gray-400 bg-gray-100 text-gray-900': statusFilter === 'pending',
            'border-gray-200 text-gray-600 hover:bg-gray-50': statusFilter !== 'pending',
            'text-gray-400': statusFilter !== 'pending' && pendingCount === 0,
          }"
          :title="t('timeline.status_filter.pending')"
          @click="emit('toggle-status-filter', 'pending')"
        >
          <img src="@/assets/icons/Caution.png" alt="Pending" class="h-5 w-5" />
        </button>
        <button
          class="inline-flex min-w-fit items-center gap-2 rounded-lg border p-2 transition-colors"
          :class="{
            'border-gray-400 bg-gray-100 text-gray-900': statusFilter === 'resolved',
            'border-gray-200 text-gray-600 hover:bg-gray-50': statusFilter !== 'resolved',
            'text-gray-400': statusFilter !== 'resolved' && resolvedCount === 0,
          }"
          :title="t('timeline.status_filter.resolved')"
          @click="emit('toggle-status-filter', 'resolved')"
        >
          <CheckmarkIcon size="sm" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import SearchBar from '@/components/core/SearchBar.vue';
import CheckmarkIcon from '@/components/ui/CheckmarkIcon.vue';

defineProps<{
  searchText: string;
  statusFilter: 'all' | 'pending' | 'resolved';
  pendingCount: number;
  resolvedCount: number;
}>();

const emit = defineEmits<{
  'update-search-text': [value: string];
  'toggle-status-filter': [value: 'pending' | 'resolved'];
}>();

const { t } = useI18n();
</script>

<style scoped>
/* No additional styles needed */
</style>
