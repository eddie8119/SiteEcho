<template>
  <div class="flex w-full flex-col">
    <div class="w-full">
      <div class="flex w-full rounded-full border" style="border-color: rgb(0 0 0 / 8%)">
        <button
          v-for="(tab, index) in tabs"
          :key="tab.value"
          class="tab-button flex-1 overflow-hidden text-ellipsis whitespace-nowrap rounded-none px-2 py-2 first:rounded-l-full last:rounded-r-full"
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
interface TabItem {
  value: T;
  label?: string;
}

const { modelValue, tabs } = defineProps<{
  modelValue: T;
  tabs: TabItem[];
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

.dark .tab-button + .tab-button {
  border-left: 1px solid rgb(255 255 255 / 15%);
}

.tab-button + .tab-button {
  border-left: 1px solid rgb(0 0 0 / 8%);
}
</style>
