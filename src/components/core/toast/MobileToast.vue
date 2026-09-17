<template>
  <Transition name="toast-slide">
    <button
      v-if="isVisible"
      class="absolute left-4 right-4 top-20 z-50 cursor-pointer appearance-none border-none bg-transparent p-0 text-left"
      @click="handleAction"
    >
      <div
        class="flex items-center gap-4 rounded-lg bg-white px-5 py-4 shadow-lg transition-transform active:scale-95"
      >
        <div :class="iconContainerClass">
          <svg
            v-if="variant === 'success'"
            class="h-5 w-5 text-orange-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <svg
            v-else-if="variant === 'error'"
            class="h-5 w-5 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          <svg
            v-else
            class="h-5 w-5 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div class="flex-1">
          <p :class="titleClass">{{ title }}</p>
          <p class="text-sm text-gray-500">{{ subtitle }}</p>
        </div>
        <div v-if="actionText" class="flex-shrink-0 text-sm font-medium text-brand-primary">
          {{ actionText }}
        </div>
      </div>
    </button>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';

interface Props {
  variant?: 'success' | 'error' | 'info';
  title: string;
  subtitle: string;
  actionText?: string;
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'success',
  duration: 3000,
});

const emit = defineEmits<{
  action: [];
  close: [];
}>();

const isVisible = ref(true);

const iconContainerClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'rounded-full bg-orange-100 p-2';
    case 'error':
      return 'rounded-full bg-red-100 p-2';
    default:
      return 'rounded-full bg-yellow-100 p-2';
  }
});

const titleClass = computed(() => {
  switch (props.variant) {
    case 'success':
      return 'font-medium text-gray-900';
    case 'error':
      return 'font-medium text-gray-900';
    default:
      return 'font-medium text-gray-900';
  }
});

const handleAction = () => {
  isVisible.value = false;
  if (props.actionText) {
    emit('action');
  }
};

const close = () => {
  isVisible.value = false;
  emit('close');
};

onMounted(() => {
  if (props.duration > 0) {
    setTimeout(close, props.duration);
  }
});
</script>

<style scoped>
.toast-slide-enter-active,
.toast-slide-leave-active {
  transition: all 0.3s ease;
}

.toast-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.toast-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
