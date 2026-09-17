<template>
  <OptionSelector
    v-model="model"
    :options="PROJECT_TYPES"
    :class-name="'w-full md:w-[160px]'"
    :namespace="'projectType'"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';

import type { ProjectType } from '@/types/selection';

import OptionSelector from '@/components/ui/OptionSelector.vue';
import { PROJECT_TYPES } from '@/constants/selection';

const props = defineProps<{
  projectType: ProjectType | undefined;
}>();

const emit = defineEmits<{
  (e: 'update:project-type', value: ProjectType): void;
}>();

// Proxy v-model to emit update:project-type
const model = computed<ProjectType | undefined>({
  get: () => props.projectType,
  set: (val: ProjectType | undefined) => {
    if (val !== undefined) {
      emit('update:project-type', val as ProjectType);
    }
  },
});
</script>

<style scoped>
.title-edit input {
  transition: none;
}
</style>
