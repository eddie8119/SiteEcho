<template>
  <div v-if="shares && shares.length > 0" class="mt-4">
    <!-- Divider -->
    <div class="h-px bg-gray-200" />

    <!-- Share Records Section -->
    <div class="mt-4">
      <!-- Header -->
      <button
        class="flex w-full items-center justify-between text-sm font-medium text-gray-700"
        @click="isExpanded = !isExpanded"
      >
        <div class="flex items-center gap-2">
          <span
            >📤
            {{
              isExpanded ? $t('photo.shareRecords.shareRecords') : $t('photo.shareRecords.shared')
            }}（{{ shares.length }}）</span
          >
        </div>
        <svg
          class="h-5 w-5 transform text-gray-400 transition-transform"
          :class="{ 'rotate-90': isExpanded }"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <!-- Expanded Content -->
      <Transition
        enter-active-class="transition-all duration-200 ease-out"
        enter-from-class="max-h-0 opacity-0"
        enter-to-class="max-h-96 opacity-100"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="max-h-96 opacity-100"
        leave-to-class="max-h-0 opacity-0"
      >
        <div v-if="isExpanded" class="mt-3 overflow-hidden">
          <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
            <div class="space-y-2">
              <div
                v-for="share in sortedShares"
                :key="share.id"
                class="flex items-center justify-between text-sm text-gray-700"
              >
                <div class="flex items-center gap-1">
                  <span v-if="share.trade">{{ share.trade }}｜</span>
                  <span class="font-medium">{{ share.displayName }}</span>
                </div>
                <span class="text-xs text-gray-500">{{
                  formatShortDateTime(share.createdAt)
                }}</span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';

import type { PhotoShare } from '@/types/photo';

import { formatShortDateTime } from '@/utils/date';

const props = defineProps<{
  shares: PhotoShare[];
}>();

const isExpanded = ref(false);

const sortedShares = computed(() => {
  return [...props.shares].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
});
</script>
