<template>
  <div class="border-b border-gray-200 bg-white px-4 py-3">
    <div class="mx-auto max-w-4xl">
      <!-- Multi-Select Mode -->
      <div v-if="isMultiSelectMode" class="flex items-center justify-between">
        <span class="text-sm font-semibold text-gray-700">{{
          t('trash.filter.selectedCount', { count: selectedCount })
        }}</span>
        <div class="flex gap-2">
          <button
            class="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100"
            @click="emit('cancel')"
          >
            {{ t('button.cancel') }}
          </button>
          <button
            class="rounded-lg bg-red-500 px-3 py-1 text-sm text-white hover:bg-red-600"
            @click="emit('delete')"
          >
            {{ t('button.delete') }}
          </button>
        </div>
      </div>

      <!-- Normal Mode: Pending Filter -->
      <TextButton
        v-else
        :variant="showPendingOnly ? 'primary' : 'secondary'"
        @click="emit('toggle-filter')"
      >
        {{ t('trash.filter.pending', { count: pendingCount }) }}
      </TextButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';

defineProps<{
  isMultiSelectMode: boolean;
  selectedCount: number;
  showPendingOnly: boolean;
  pendingCount: number;
}>();

const emit = defineEmits<{
  cancel: [];
  delete: [];
  'toggle-filter': [];
}>();

const { t } = useI18n();
</script>
