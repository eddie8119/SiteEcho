<template>
  <button type="button" class="gap-1" v-bind="$attrs">
    <span class="font-medium">{{ label }}</span>
    <ElIcon :class="['toggle-icon', isOpen && 'is-open']">
      <CaretBottom />
    </ElIcon>
  </button>
</template>

<script setup lang="ts">
import { CaretBottom } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';

defineProps<{
  label: string;
  isOpen: boolean;
}>();
</script>

<style scoped>
.toggle-icon {
  @apply transition-transform duration-200;
}

.toggle-icon.is-open {
  @apply rotate-180;
}
</style>
