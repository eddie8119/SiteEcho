<template>
  <Teleport to="body">
    <div
      v-if="show"
      class="fixed inset-0 z-[9999] flex items-center justify-center"
      @click="$emit('close')"
    >
      <div
        class="modal-overlay relative h-full w-full overflow-hidden"
        style="background-color: rgb(0, 0, 0) !important"
        @click.stop
      >
        <!-- Close Button -->
        <button
          class="absolute right-4 top-4 z-30 rounded-full bg-gray-800/80 p-2 text-white shadow-lg transition-colors hover:bg-gray-900"
          @click="$emit('close')"
        >
          <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        <!-- Image Container -->
        <div
          class="flex h-full w-full cursor-grab items-center justify-center overflow-hidden active:cursor-grabbing"
          @mousedown="startPan"
          @mousemove="pan"
          @mouseup="endPan"
          @mouseleave="endPan"
          @wheel="handleWheel"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd"
        >
          <img
            :src="imageUrl"
            :alt="alt"
            :style="imageStyle"
            class="max-h-full max-w-full object-contain transition-transform duration-100 ease-out"
          />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

interface Props {
  show: boolean;
  imageUrl: string;
  alt?: string;
}

interface Emits {
  (e: 'close'): void;
}

const props = withDefaults(defineProps<Props>(), {
  alt: 'photo',
});

defineEmits<Emits>();

// Image preview zoom/pan state
const scale = ref(1);
const position = ref({ x: 0, y: 0 });
const isDragging = ref(false);
const dragStart = ref({ x: 0, y: 0 });
const initialTouchDistance = ref(0);
const initialScale = ref(1);

// Image preview zoom/pan functions
const imageStyle = computed(() => ({
  transform: `translate(${position.value.x}px, ${position.value.y}px) scale(${scale.value})`,
}));

const resetZoom = () => {
  scale.value = 1;
  position.value = { x: 0, y: 0 };
};

const startPan = (e: MouseEvent) => {
  if (scale.value > 1) {
    isDragging.value = true;
    dragStart.value = { x: e.clientX - position.value.x, y: e.clientY - position.value.y };
  }
};

const pan = (e: MouseEvent) => {
  if (isDragging.value && scale.value > 1) {
    e.preventDefault();
    position.value = {
      x: e.clientX - dragStart.value.x,
      y: e.clientY - dragStart.value.y,
    };
  }
};

const endPan = () => {
  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  const delta = e.deltaY > 0 ? -0.2 : 0.2;
  scale.value = Math.max(1, Math.min(5, scale.value + delta));
};

const getTouchDistance = (touches: TouchList) => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    initialTouchDistance.value = getTouchDistance(e.touches);
    initialScale.value = scale.value;
  } else if (e.touches.length === 1 && scale.value > 1) {
    isDragging.value = true;
    dragStart.value = {
      x: e.touches[0].clientX - position.value.x,
      y: e.touches[0].clientY - position.value.y,
    };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    e.preventDefault();
    const currentDistance = getTouchDistance(e.touches);
    const scaleFactor = currentDistance / initialTouchDistance.value;
    scale.value = Math.max(1, Math.min(5, initialScale.value * scaleFactor));
  } else if (e.touches.length === 1 && isDragging.value) {
    e.preventDefault();
    position.value = {
      x: e.touches[0].clientX - dragStart.value.x,
      y: e.touches[0].clientY - dragStart.value.y,
    };
  }
};

const handleTouchEnd = () => {
  isDragging.value = false;
};

// Reset zoom when modal closes
watch(
  () => props.show,
  (newVal) => {
    if (!newVal) {
      resetZoom();
    }
  }
);
</script>

<style scoped lang="scss">
.modal-overlay {
  background-color: rgb(0, 0, 0) !important;
}
</style>
