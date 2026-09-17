<template>
  <div class="w-full">
    <div v-if="showToggle" class="mb-2 flex w-full items-center justify-end gap-1">
      <CollapseButton :is-collapsed="collapsed" @click="toggle">
        {{ collapsed ? props.expandText : props.collapseText }}
      </CollapseButton>
      <span v-if="itemsCount !== null" class="text-gray-400">({{ itemsCount }})</span>
    </div>

    <div v-show="!collapsed">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';

import CollapseButton from '@/components/core/button/CollapseButton.vue';
const props = withDefaults(
  defineProps<{
    defaultCollapsed?: boolean;
    showToggle?: boolean;
    expandText?: string;
    collapseText?: string;
    itemsCount?: number | null;
  }>(),
  {
    defaultCollapsed: false,
    showToggle: true,
    expandText: '',
    collapseText: '',
    itemsCount: null,
  }
);
const emit = defineEmits<{ (e: 'change', value: boolean): void }>();
const collapsed = ref<boolean>(props.defaultCollapsed);

watch(
  () => props.defaultCollapsed,
  (v) => {
    collapsed.value = v;
  }
);

const toggle = () => {
  collapsed.value = !collapsed.value;
  emit('change', collapsed.value);
};
</script>

<style scoped></style>
