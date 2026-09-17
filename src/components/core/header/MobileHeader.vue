<template>
  <div
    class="mobile-header safe-area-top-sm sticky top-0 z-40 border-b border-gray-200 bg-white px-3 py-2"
  >
    <div class="relative mx-auto flex max-w-4xl items-center justify-between">
      <div class="flex items-center gap-3">
        <button v-if="showBack" class="rounded-lg p-2 hover:bg-orange-100" @click="handleBack">
          <slot name="back-icon">
            <svg
              class="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </slot>
        </button>
        <slot name="left" />
        <h2 class="text-lg font-medium text-gray-900">{{ title }}</h2>
      </div>
      <div class="absolute left-1/2 -translate-x-1/2">
        <slot name="center" />
      </div>
      <slot name="right" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';

const props = withDefaults(defineProps<Props>(), {
  showBack: true,
  onBack: undefined,
});

const router = useRouter();

interface Props {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}

const handleBack = () => {
  if (props.onBack) {
    props.onBack();
  } else {
    router.back();
  }
};
</script>
