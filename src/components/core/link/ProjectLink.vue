<template>
  <TextLink :to="linkTo" v-bind="$attrs">
    <slot />
  </TextLink>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import TextLink from '@/components/core/link/TextLink.vue';

const props = defineProps<{
  projectId?: string | number;
  taskTitle?: string;
}>();

const linkTo = computed(() => {
  if (props.projectId === undefined || props.projectId === null) {
    return null;
  }

  const path = `/app/todo/project/${props.projectId}`;
  if (!props.taskTitle) {
    return { path };
  }
  return {
    path,
    query: {
      taskTitle: props.taskTitle,
    },
  };
});
</script>
