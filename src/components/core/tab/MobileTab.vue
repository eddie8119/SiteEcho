<template>
  <div class="flex w-full gap-1 rounded-lg bg-gray-100 dark:bg-gray-800">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="flex-1 rounded-md border-none bg-transparent px-4 py-2.5 text-sm font-medium transition-all hover:bg-white/50 dark:hover:bg-white/5"
      :class="[
        modelValue === tab.value
          ? 'bg-white font-semibold text-brand-primary shadow-sm dark:bg-gray-700 dark:text-brand-primary dark:shadow-none'
          : 'text-gray-600 dark:text-gray-400',
      ]"
      @click="emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
const { modelValue, tabs } = defineProps<{
  modelValue: string | number;
  tabs: { value: string | number; label?: string }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void;
}>();
</script>
