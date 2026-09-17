<template>
  <div class="flex h-full flex-col items-center justify-center text-gray-500">
    <ElIcon :size="iconSize" class="mb-2" :style="{ color: 'var(--color-brand-primary)' }">
      <component :is="iconComponent" />
    </ElIcon>
    <slot>
      <p v-if="message" class="text-sm font-medium text-brand-primary">
        {{ message }}
      </p>
    </slot>
  </div>
</template>

<script setup lang="ts">
import { DocumentRemove } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import { computed } from 'vue';

import type { Component } from 'vue';

const props = withDefaults(
  defineProps<{
    message?: string;
    icon?: Component;
    iconSize?: number;
  }>(),
  {
    iconSize: 32,
  }
);

const iconComponent = computed(() => props.icon ?? DocumentRemove);
</script>
