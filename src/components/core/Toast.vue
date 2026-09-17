<template>
  <Teleport to="body">
    <Transition name="toast-fade">
      <div
        v-if="isVisible"
        class="fixed bottom-4 right-4 z-50 max-w-sm rounded-lg p-4 shadow-lg"
        :class="[
          variant === 'success' && 'border border-green-200 bg-green-50',
          variant === 'error' && 'border border-red-200 bg-red-50',
          variant === 'info' && 'border border-blue-200 bg-blue-50',
        ]"
      >
        <div class="flex items-start gap-3">
          <div
            :class="[
              'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full',
              variant === 'success' && 'bg-green-100',
              variant === 'error' && 'bg-red-100',
              variant === 'info' && 'bg-blue-100',
            ]"
          >
            <svg
              v-if="variant === 'success'"
              class="h-3 w-3 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"
              />
            </svg>
            <svg
              v-else-if="variant === 'error'"
              class="h-3 w-3 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
            <svg v-else class="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clip-rule="evenodd"
              />
            </svg>
          </div>
          <div class="flex-1">
            <p
              :class="[
                'text-sm font-medium',
                variant === 'success' && 'text-green-800',
                variant === 'error' && 'text-red-800',
                variant === 'info' && 'text-blue-800',
              ]"
            >
              {{ message }}
            </p>
          </div>
          <button
            type="button"
            class="flex-shrink-0 text-gray-400 hover:text-gray-600"
            @click="close"
          >
            <svg class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path
                fill-rule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clip-rule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';

interface Props {
  message: string;
  variant?: 'success' | 'error' | 'info';
  duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'info',
  duration: 4000,
});

const emit = defineEmits<{
  close: [];
}>();

const isVisible = ref(true);

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
.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: all 0.3s ease;
}

.toast-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.toast-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
