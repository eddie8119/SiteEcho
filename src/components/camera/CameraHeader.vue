<template>
  <div class="camera-header safe-area-top pointer-events-none absolute inset-x-0 top-0 z-40 p-4">
    <!-- Top Row: Project Selector and Pending Status Toggle -->
    <div class="flex items-start justify-between">
      <div class="pointer-events-auto">
        <ProjectSelector />
      </div>

      <!-- Pending Status Toggle -->
      <div
        class="bg-black/50 pointer-events-auto flex items-center gap-2 rounded-lg px-3 py-2 backdrop-blur"
      >
        <span class="text-xs font-medium text-white">{{ t('camera.status.pending') }}</span>
        <button
          class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
          :class="isPending ? 'bg-brand-primary' : 'bg-gray-400'"
          @click="$emit('update:isPending', !isPending)"
        >
          <span
            class="inline-block h-5 w-5 transform rounded-full bg-white transition-transform"
            :class="isPending ? 'translate-x-5' : 'translate-x-0.5'"
          />
        </button>
      </div>
    </div>

    <!-- Second Row: High Quality Mode Indicator -->
    <div class="mt-2 flex items-center justify-between">
      <!-- High Quality Mode Indicator -->
      <div
        v-if="isHighQualityMode"
        class="pointer-events-auto flex items-center gap-1.5 rounded-full bg-orange-500/80 px-2 py-1.5 backdrop-blur-sm"
        @click="$emit('disable-high-quality')"
      >
        <div class="h-2 w-2 animate-pulse rounded-full bg-white" />
        <span class="text-[10px] font-bold tracking-wider text-white">{{
          t('camera.status.high_quality_mode_on')
        }}</span>
        <svg class="h-3 w-3 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 12 12">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M3 9L9 3M3 3l6 6"
          />
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import ProjectSelector from '@/components/project/ProjectSelector.vue';

defineProps<{
  isPending: boolean;
  isHighQualityMode?: boolean;
}>();

defineEmits<{
  'update:isPending': [value: boolean];
  'disable-high-quality': [];
}>();

const { t } = useI18n();
</script>

<style scoped>
@supports (top: env(safe-area-inset-top)) {
  .safe-area-top {
    /* Limit safe-area-inset-top to max 50px to prevent iOS bugs */
    padding-top: calc(1rem + min(env(safe-area-inset-top, 0px), 50px));
  }
}

/* Only apply safe area adjustment on touch devices (phones, tablets) */
@media (pointer: fine) {
  .safe-area-top {
    padding-top: 1rem !important;
  }
}
</style>
