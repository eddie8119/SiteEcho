<template>
  <Transition name="slide-panel">
    <div
      v-if="modelValue"
      :class="[
        'fixed top-0 z-[999] flex overflow-hidden bg-white shadow-xl',
        side === 'right' ? 'right-0 rounded-l-[20px]' : 'left-0 rounded-r-[20px]',
        side === 'right' ? 'from-right' : 'from-left',
      ]"
      :style="panelStyle"
    >
      <DeleteButton
        v-if="showClose"
        class="absolute z-10 inline-flex items-center rounded-lg bg-transparent p-1.5 text-sm text-gray-400 hover:bg-gray-200 hover:text-gray-900"
        :class="[side === 'right' ? 'left-4 sm:left-6' : 'right-4 sm:right-6', 'top-4 sm:top-6']"
        width="w-8"
        height="h-8"
        icon-width="w-4"
        icon-height="h-4"
        aria-label="Close"
        @click="
          $emit('update:modelValue', false);
          $emit('close');
        "
      />
      <div class="h-full w-full overflow-auto" :class="bodyClass">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import DeleteButton from '@/components/ui/DeleteButton.vue';

interface Props {
  modelValue: boolean; // v-model
  side?: 'left' | 'right';
  topOffsetRem?: number; // header height in rem (default 4 -> 64px)
  widthPercent?: number; // panel width percent of viewport (default 45)
  maxWidthPx?: number; // max width in px (default 350)
  showClose?: boolean;
  bodyClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  side: 'right',
  topOffsetRem: 4,
  widthPercent: 45,
  maxWidthPx: 350,
  showClose: true,
  bodyClass: 'p-6',
});

defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'close'): void;
}>();

const panelStyle = computed(() => {
  const top = `${props.topOffsetRem}rem`;
  const height = `calc(100vh - ${props.topOffsetRem}rem)`;
  const width = `${props.widthPercent}vw`;
  const maxWidth = `${props.maxWidthPx}px`;
  return {
    top,
    height,
    width,
    maxWidth,
  } as Record<string, string>;
});
</script>

<style scoped>
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: all 0.35s ease;
}

/* Slide from the right */
.from-right.slide-panel-enter {
  transform: translateX(550px);
}

.from-right.slide-panel-enter-to {
  transform: translateX(0);
}

.from-right.slide-panel-leave-to {
  transform: translateX(550px);
}

/* Slide from the left */
.from-left.slide-panel-enter {
  transform: translateX(-550px);
}

.from-left.slide-panel-enter-to {
  transform: translateX(0);
}

.from-left.slide-panel-leave-to {
  transform: translateX(-550px);
}
</style>
