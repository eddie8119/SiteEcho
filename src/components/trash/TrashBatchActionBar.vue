<template>
  <BaseBatchActionBar :is-visible="isVisible" :count="count" @cancel="emit('cancel')">
    <template #actions>
      <div class="flex gap-2">
        <button
          :disabled="isDisabled"
          class="flex-1 rounded-xl border border-gray-300 py-1 text-sm font-medium text-gray-700 hover:bg-orange-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handleRestore"
        >
          <div class="flex flex-col items-center gap-1">
            <img src="@/assets/icons/Restore.svg" alt="Restore" class="h-4 w-4" />
            <span>{{ t('trash.actions.restore') }}</span>
          </div>
        </button>
        <button
          :disabled="isDisabled"
          class="flex-1 rounded-xl border border-gray-300 py-1 text-sm font-medium text-gray-700 hover:bg-orange-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          @click="handlePermanentDelete"
        >
          <div class="flex flex-col items-center gap-1">
            <TrashIcon class="h-4 w-4" />
            <span>{{ t('trash.actions.permanentDelete') }}</span>
          </div>
        </button>
      </div>
    </template>
  </BaseBatchActionBar>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import BaseBatchActionBar from '@/components/core/BaseBatchActionBar.vue';
import TrashIcon from '@/components/ui/TrashIcon.vue';

defineProps<{
  isVisible: boolean;
  count: number;
  isDisabled?: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  restore: [];
  'permanent-delete': [];
}>();

const { t } = useI18n();

const handleRestore = () => {
  emit('restore');
};

const handlePermanentDelete = () => {
  emit('permanent-delete');
};
</script>
