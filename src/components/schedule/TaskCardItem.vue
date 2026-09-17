<template>
  <div
    :class="['min-w-0', isExpanded ? 'w-full basis-full' : 'w-[140px] flex-shrink-0 md:w-[150px]']"
  >
    <!-- Collapsed View -->
    <div
      v-if="!isExpanded"
      class="taskCard-container flex min-h-[120px] cursor-pointer flex-col justify-between p-4 transition-all"
      role="button"
      tabindex="0"
      :aria-expanded="isExpanded"
      @click="toggleExpand"
      @keydown.enter.prevent="toggleExpand"
      @keydown.space.prevent="toggleExpand"
    >
      <header class="flex items-center justify-between">
        <div class="mb-2 flex items-center gap-1 font-medium text-gray-500">
          <template v-if="dueAt">
            <ElIcon v-if="dueType === 'reminder'" class="text-xs text-yellow-500">
              <Bell />
            </ElIcon>
            <ElIcon v-else-if="dueType === 'end'" class="text-xs text-blue-500">
              <Clock />
            </ElIcon>
            <time :datetime="dueISO">
              {{ formatTime(dueAt) }}
            </time>
          </template>
          <span v-else class="text-xs text-gray-400"
            >{{ t('common.no') }}{{ t('label.end_date_time') }}</span
          >
        </div>

        <button
          type="button"
          class="h-6 w-6 rounded bg-black-100 hover:bg-gray-100"
          aria-label="Expand task card"
          @click.stop="toggleExpand"
        >
          <ElIcon class="text-gray-600"><ArrowRight /></ElIcon>
        </button>
      </header>

      <ProjectLink :project-id="task.projectId" :task-title="task.title">
        <H2Title :title="task.title + ' - ' + projectName" :class-name="'toggle-link'" />
      </ProjectLink>
      <div v-if="task.description" class="w-full overflow-hidden text-ellipsis whitespace-nowrap">
        {{ task.description }}
      </div>

      <div class="mt-2 flex items-center gap-2">
        <TaskStatusDropdown class="ml-auto" :read-only="true" :status="task.status" />
      </div>
    </div>

    <!-- Expanded View -->
    <div v-else class="w-full rounded-lg bg-primary-card p-4 shadow-md">
      <header class="mb-3 flex items-start justify-between">
        <button
          type="button"
          class="h-6 w-6 rounded bg-black-100 hover:bg-gray-100"
          aria-label="Collapse task card"
          @click="handleCloseClick"
        >
          <ElIcon class="text-gray-600"><Close /></ElIcon>
        </button>
      </header>

      <!-- Full Task Card Content -->
      <TaskCardBase
        :task="task"
        :read-only="false"
        @update:task="handleUpdateTask"
        @delete="handleDeleteTask"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRight, Bell, Clock, Close } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import { computed, onDeactivated, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ProjectTitle } from '@/types/project';
import type { TaskResponse } from '@/types/response';

import ProjectLink from '@/components/core/link/ProjectLink.vue';
import H2Title from '@/components/core/title/H2Title.vue';
import TaskCardBase from '@/components/task/TaskCardBase.vue';
import TaskStatusDropdown from '@/components/ui/TaskStatusDropdown.vue';
import { useProjectTitleListContext } from '@/context/useProjectTitleListContext';
import { useEditingStateStore } from '@/stores/useEditingStateStore';
import { formatTimeOnly as formatTime } from '@/utils/date';

const props = defineProps<{
  task: TaskResponse;
  expanded: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:expanded', value: boolean): void;
  (e: 'update:task', taskId: string, patch: Partial<TaskResponse>): void;
  (e: 'delete', taskId: string): void;
}>();

const { t } = useI18n();
const editingStateStore = useEditingStateStore();

const isExpanded = ref(props.expanded);

// Get project title from context
const { projectTitleList } = useProjectTitleListContext();

const projectName = computed(() => {
  const project = projectTitleList.value.find((p: ProjectTitle) => p.id === props.task.projectId);
  return project?.title ?? props.task.projectId;
});

// Metadata for due/reminder time used in template semantics
const dueAt = computed(() => props.task.reminderDateTime || props.task.endDateTime || null);
const dueISO = computed(() => (dueAt.value ? new Date(dueAt.value).toISOString() : ''));
const dueType = computed<'reminder' | 'end' | null>(() => {
  if (props.task.reminderDateTime) return 'reminder';
  if (props.task.endDateTime) return 'end';
  return null;
});

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
  emit('update:expanded', isExpanded.value);
};

const handleCloseClick = () => {
  // 確保 isEditing 為 false
  editingStateStore.stopEditing();
  toggleExpand();
};

onDeactivated(() => {
  if (isExpanded.value) {
    isExpanded.value = false;
    emit('update:expanded', false);
  }
});

const handleUpdateTask = (taskId: string, patch: Partial<TaskResponse>) => {
  emit('update:task', taskId, patch);
};

const handleDeleteTask = (taskId: string) => {
  emit('delete', taskId);
};
</script>

<style scoped></style>
