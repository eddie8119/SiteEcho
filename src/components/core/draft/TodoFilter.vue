<template>
  <div class="mb-4 flex flex-wrap items-center justify-between">
    <PillTab
      :model-value="selected"
      :tabs="TODO_FILTER"
      @update:model-value="$emit('change-filter', $event)"
    >
      <template #item="{ tab }">
        {{ t(`option.status.${tab.value}`) }}
      </template>
    </PillTab>

    <button
      class="mt-2 flex items-center rounded-md px-3 py-1 text-sm font-medium text-secondary-red hover:bg-red-50 hover:text-secondary-red sm:mt-0"
      @click="$emit('clear-done')"
    >
      <TrashButton />
      {{ t('button.delete_completed') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import PillTab from '@/components/core/tab/PillTab.vue';
import TrashButton from '@/components/ui/TrashButton.vue';
import { TODO_FILTER } from '@/constants/selection';

defineProps({
  selected: {
    type: String,
    required: true,
  },
});

defineEmits(['change-filter', 'clear-done']);
const { t } = useI18n();
</script>
