<template>
  <button
    type="button"
    :class="[
      'rounded-md px-2 py-1 text-xs transition-colors',
      variant === 'primary'
        ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
      customClass,
    ]"
    v-bind="$attrs"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    isCollapsed: boolean;
    variant?: 'primary' | 'secondary';
    customClass?: string;
  }>(),
  {
    variant: 'primary',
    customClass: '',
  }
);
</script>
