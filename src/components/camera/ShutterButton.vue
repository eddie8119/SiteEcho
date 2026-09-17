<template>
  <button
    class="flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-lg transition-transform hover:scale-110 active:scale-95"
    :disabled="isCapturing"
    @click="emit('capture')"
  >
    <div
      v-if="isCapturing"
      class="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-blue-500"
    />
    <svg v-else class="h-8 w-8 text-brand-primary" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
    </svg>
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isCapturing?: boolean;
  }>(),
  {
    isCapturing: false,
  }
);

const emit = defineEmits<{
  capture: [];
}>();
</script>

<style scoped lang="scss">
button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
