<template>
  <div class="panel-container flex h-full flex-col overflow-hidden">
    <!-- Header -->
    <div
      class="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700"
    >
      <div class="flex items-center gap-2">
        <H2Title :title="t('title.unscheduled_task')" />
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="tasks.length === 0"
      class="flex flex-1 flex-col items-center justify-center text-center"
    >
      <ElIcon :size="48" class="mb-3 text-gray-400">
        <Calendar />
      </ElIcon>
      <p class="text-sm text-gray-500">{{ t('message.no_unscheduled_task') }}</p>
    </div>

    <!-- Task List -->
    <div v-else class="flex flex-wrap gap-2 overflow-y-auto sm:gap-3">
      <TaskCardItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        :expanded="expandedTaskIds.has(task.id)"
        @update:expanded="(value) => updateTaskExpanded(task.id, value)"
        @update:task="handleUpdateTask"
        @delete="handleDeleteTask"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Calendar } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TaskResponse } from '@/types/response';

import H2Title from '@/components/core/title/H2Title.vue';
import TaskCardItem from '@/components/schedule/TaskCardItem.vue';

defineProps<Props>();

const emit = defineEmits<Emits>();

const { t } = useI18n();

interface Props {
  tasks: TaskResponse[];
}

interface Emits {
  (e: 'update:task', taskId: string, patch: Partial<TaskResponse>): void;
  (e: 'delete', taskId: string): void;
}

// Expanded task tracking
const expandedTaskIds = ref<Set<string>>(new Set());

const updateTaskExpanded = (taskId: string, expanded: boolean) => {
  if (expanded) {
    expandedTaskIds.value.add(taskId);
  } else {
    expandedTaskIds.value.delete(taskId);
  }
};

const handleUpdateTask = (taskId: string, patch: Partial<TaskResponse>) => {
  emit('update:task', taskId, patch);
};

const handleDeleteTask = (taskId: string) => {
  emit('delete', taskId);
};
</script>

<style scoped></style>
