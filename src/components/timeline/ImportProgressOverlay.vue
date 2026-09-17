<template>
  <Teleport to="body">
    <div
      v-if="isVisible"
      class="bg-black/80 fixed inset-0 z-[100] flex items-center justify-center backdrop-blur-sm"
    >
      <div class="w-full max-w-xs rounded-2xl bg-white px-6 py-8 text-center shadow-2xl">
        <div class="mb-4 flex justify-center">
          <div class="relative h-20 w-20">
            <svg class="h-20 w-20" viewBox="0 0 100 100">
              <circle
                class="text-gray-200"
                stroke-width="8"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
              <circle
                class="text-secondary-purple-a transition-all duration-300 ease-out"
                stroke-width="8"
                :stroke-dasharray="251.2"
                :stroke-dashoffset="251.2 - (251.2 * progress) / 100"
                stroke-linecap="round"
                stroke="currentColor"
                fill="transparent"
                r="40"
                cx="50"
                cy="50"
              />
            </svg>
            <div class="absolute inset-0 flex items-center justify-center text-lg font-bold">
              {{ progress }}%
            </div>
          </div>
        </div>
        <h3 class="mb-1 text-lg font-bold text-gray-900">{{ t('upload.importingPhotos') }}</h3>
        <p class="text-sm text-gray-500">{{ t('upload.importingProgress', { current, total }) }}</p>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  isVisible: boolean;
  progress: number;
  current: number;
  total: number;
}>();

const { t } = useI18n();
</script>
