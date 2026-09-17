<template>
  <button
    class="inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-1 text-sm font-medium shadow-sm transition-all"
    :class="[
      isLoading
        ? 'cursor-not-allowed border-gray-300 bg-gray-100 text-gray-500'
        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100',
      fullWidth ? 'w-full' : '',
    ]"
    :disabled="isLoading"
    @click="handleClick"
  >
    <svg
      class="h-4 w-4"
      :class="{ 'animate-spin': isLoading }"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
    {{ isLoading ? loadingText : buttonText }}
  </button>
</template>

<script setup lang="ts">
interface Props {
  isLoading?: boolean;
  buttonText?: string;
  loadingText?: string;
  fullWidth?: boolean;
}

interface Emits {
  (e: 'click'): void;
}

const props = withDefaults(defineProps<Props>(), {
  isLoading: false,
  buttonText: '重新整理',
  loadingText: '整理中...',
  fullWidth: false,
});

const emit = defineEmits<Emits>();

const handleClick = () => {
  if (!props.isLoading) {
    emit('click');
  }
};
</script>

<style scoped lang="scss">
button {
  outline: none;

  // 強制顯示邊框
  &.border {
    border-style: solid !important;
    border-width: 1px !important;
  }
}
</style>
