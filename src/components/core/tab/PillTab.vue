<template>
  <div class="flex min-w-0 flex-col">
    <Label v-if="showLabel" :label="label ?? ''" />
    <!-- Mobile: single-line with horizontal scroll; Desktop: inline without scroll -->
    <div class="w-full overflow-x-auto lg:overflow-visible">
      <div class="pill-tab-container inline-flex whitespace-nowrap rounded-full border">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.value"
          class="tab-button shrink-0 rounded-none px-3 py-2 first:rounded-l-full first:pl-5 last:rounded-r-full last:pr-5"
          :class="{ 'is-active': modelValue === tab.value }"
          :aria-selected="modelValue === tab.value"
          @click="emit('update:modelValue', tab.value)"
        >
          <slot name="item" :tab="tab" :index="index">
            {{ tab.label ?? String(tab.value) }}
          </slot>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string | number">
import Label from '@/components/core/title/Label.vue';

interface TabItem {
  value: T;
  label?: string;
}

const { modelValue, tabs, label, showLabel } = defineProps<{
  modelValue: T;
  tabs: TabItem[];
  label?: string;
  showLabel?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: T): void;
}>();
</script>

<style scoped>
.tab-button {
  @apply bg-primary-panel text-black-400 dark:bg-primaryDark-panel;

  cursor: pointer;
}

.tab-button.is-active {
  @apply bg-brand-primary text-black-900;
}

.pill-tab-container {
  border-color: rgb(0 0 0 / 8%);
}

.dark .pill-tab-container {
  border-color: rgb(255 255 255 / 15%);
}

/* Add separators between items on md and above */
@media (min-width: 768px) {
  .tab-button + .tab-button {
    border-left: 1px solid rgb(0 0 0 / 8%);
  }

  .dark .tab-button + .tab-button {
    border-left-color: rgb(255 255 255 / 15%);
  }
}
</style>
