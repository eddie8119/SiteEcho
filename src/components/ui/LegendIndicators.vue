<template>
  <div
    class="legend description-text flex w-full justify-end gap-2 text-xs font-medium sm:w-auto sm:justify-start"
  >
    <div v-for="item in items" :key="item.label" class="legend-item flex items-center gap-2">
      <slot name="item" :item="item">
        <span
          class="inline-block h-5 w-5 rounded-full border border-gray-300"
          :style="{ backgroundColor: item.color }"
        />
        <span>{{ item.label }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
type LegendItem = {
  label: string;
  color?: string;
  type?: string;
};

defineProps<{ items: LegendItem[] }>();
</script>

<style scoped></style>
