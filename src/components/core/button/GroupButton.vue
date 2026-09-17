<template>
  <button
    class="flex-1 rounded-xl border border-gray-300 bg-gray-50 py-3 text-sm font-medium hover:bg-gray-100 active:bg-gray-200"
    :class="colorClass"
    @click="$emit('click')"
  >
    <slot />
  </button>
</template>

<script setup lang="ts">
interface Props {
  colorClass?: string;
}

defineProps<Props>();

defineEmits<{
  click: [];
}>();
</script>
