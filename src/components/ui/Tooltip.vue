<template>
  <span ref="anchorRef" class="pointer-events-none absolute inset-0" aria-hidden="true" />
  <Teleport to="body">
    <div
      v-if="props.text && anchorRect"
      class="pointer-events-none fixed z-[999]"
      :style="tooltipStyle"
    >
      <div
        class="text-color-difference rounded-md bg-black-200 px-2 py-1 opacity-0 transition-opacity duration-150 dark:bg-black-500"
        :class="props.visible ? 'opacity-100' : 'opacity-0'"
      >
        <span :class="props.contentClass">
          {{ props.text }}
        </span>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import {
  computed,
  type CSSProperties,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from 'vue';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

const props = withDefaults(
  defineProps<{
    text: string;
    visible?: boolean;
    position?: TooltipPosition;
    contentClass?: string;
  }>(),
  {
    visible: false,
    position: 'top',
    contentClass: 'max-w-[200px] break-words text-sm',
  }
);

const anchorRef = ref<HTMLElement | null>(null);
const anchorRect = ref<DOMRect | null>(null);

const updateAnchorRect = () => {
  if (!anchorRef.value) return;
  anchorRect.value = anchorRef.value.getBoundingClientRect();
};

const handleWindowUpdate = () => {
  if (props.visible) {
    updateAnchorRect();
  }
};

onMounted(() => {
  updateAnchorRect();
  window.addEventListener('scroll', handleWindowUpdate, true);
  window.addEventListener('resize', handleWindowUpdate);
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', handleWindowUpdate, true);
  window.removeEventListener('resize', handleWindowUpdate);
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      nextTick(() => {
        updateAnchorRect();
      });
    }
  }
);

const TOOLTIP_OFFSET = 8;

const tooltipStyle = computed<CSSProperties>(() => {
  if (!anchorRect.value) return {};

  const rect = anchorRect.value;

  if (props.position === 'bottom') {
    return {
      top: `${rect.bottom + TOOLTIP_OFFSET}px`,
      left: `${rect.left + rect.width / 2}px`,
      transform: 'translateX(-50%)',
    };
  }

  if (props.position === 'left') {
    return {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.left - TOOLTIP_OFFSET}px`,
      transform: 'translate(-100%, -50%)',
    };
  }

  if (props.position === 'right') {
    return {
      top: `${rect.top + rect.height / 2}px`,
      left: `${rect.right + TOOLTIP_OFFSET}px`,
      transform: 'translate(0, -50%)',
    };
  }

  // default: top center
  return {
    top: `${rect.top - TOOLTIP_OFFSET}px`,
    left: `${rect.left + rect.width / 2}px`,
    transform: 'translate(-50%, -100%)',
  };
});
</script>
