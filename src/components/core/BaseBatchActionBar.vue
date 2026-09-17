<template>
  <Teleport to="body">
    <Transition name="action-bar-slide">
      <div
        v-if="isVisible"
        class="panel-color-difference fixed bottom-0 left-0 right-0 z-[50] rounded-t-2xl p-3 shadow-lg"
      >
        <!-- Selection Info -->
        <div v-if="!hideCount" class="mb-2 flex items-center justify-between">
          <div>
            <span class="text-sm font-semibold text-gray-800">{{
              t('sheet.batchActionBar.selected', { count })
            }}</span>
            <p v-if="summary" class="text-xs text-gray-500">{{ summary }}</p>
          </div>
          <DeleteButton @click="emit('cancel')" />
        </div>

        <hr class="my-3 border-gray-300" />

        <!-- Actions Slot -->
        <slot name="actions">
          <div class="flex gap-2">
            <slot name="default" />
          </div>
        </slot>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import DeleteButton from '@/components/ui/DeleteButton.vue';

defineProps<{
  isVisible: boolean;
  count: number;
  summary?: string;
  hideCount?: boolean;
}>();

const emit = defineEmits<{
  cancel: [];
}>();

const { t } = useI18n();
</script>

<style scoped>
.action-bar-slide-enter-active,
.action-bar-slide-leave-active {
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
}

.action-bar-slide-enter-from,
.action-bar-slide-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
