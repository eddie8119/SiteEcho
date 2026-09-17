<template>
  <BaseBatchActionBar
    :is-visible="isVisible"
    :count="count"
    :summary="summary"
    @cancel="emit('cancel')"
  >
    <template #actions>
      <div class="flex gap-2">
        <button
          :disabled="isDisabled"
          class="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('restore')"
        >
          <div class="flex flex-col items-center gap-1">
            <img src="@/assets/icons/Restore.svg" alt="Restore" class="h-6 w-6" />
            <span>{{ t('trash.actions.restore') }}</span>
          </div>
        </button>
        <button
          :disabled="isDisabled"
          class="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-red-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
          @click="emit('delete')"
        >
          <div class="flex flex-col items-center gap-1">
            <Delete class="h-6 w-6 text-gray-700" />
            <span>{{ t('trash.actions.permanentDelete') }}</span>
          </div>
        </button>
      </div>
    </template>
  </BaseBatchActionBar>
</template>

<script setup lang="ts">
import { Delete } from '@element-plus/icons-vue';
import { useI18n } from 'vue-i18n';

import BaseBatchActionBar from '@/components/core/BaseBatchActionBar.vue';

defineProps<{
  isVisible: boolean;
  count: number;
  summary: string;
  isDisabled?: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
  restore: [];
  delete: [];
}>();

const { t } = useI18n();
</script>
