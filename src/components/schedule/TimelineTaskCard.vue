<template>
  <div
    class="taskCard-container absolute w-[calc(100%-1rem)] dark:bg-black-500"
    :style="cardStyle"
    role="button"
    tabindex="0"
  >
    <div class="flex h-full items-stretch">
      <div
        class="timeline-card__time flex w-[80px] flex-col justify-center gap-1 p-3"
        :aria-label="timeBadgeLabel"
      >
        <time v-if="taskTime" :datetime="taskTimeISO" class="text-base leading-tight">
          {{ formatTime(taskTime) }}
        </time>
        <span v-else class="text-base leading-tight">--:--</span>
        <span class="text-xs opacity-85">{{ timeBadgeLabel }}</span>
      </div>
      <div class="flex flex-1 flex-col p-2">
        <div class="flex w-full justify-between">
          <p
            v-if="task.description"
            class="cursor-pointer text-base text-blue-500"
            @click.stop="isDescriptionDialogOpen = true"
          >
            {{ t('label.detail') }}
          </p>
          <TaskStatusDropdown
            v-if="task.status"
            :read-only="true"
            :status="task.status"
            @update:status="handleStatusUpdate"
          />
        </div>
        <div class="flex flex-col">
          <ProjectLink :project-id="task.projectId" :task-title="task.title">
            <H3Title :title="task.title" :class-name="'toggle-link'" />
          </ProjectLink>
        </div>
      </div>
    </div>
    <TaskDescriptionDetailDialog
      v-model="isDescriptionDialogOpen"
      :description="task.description || ''"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { TaskResponse } from '@/types/response';

import TaskDescriptionDetailDialog from '@/components/core/dialog/TaskDescriptionDetailDialog.vue';
import ProjectLink from '@/components/core/link/ProjectLink.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import TaskStatusDropdown from '@/components/ui/TaskStatusDropdown.vue';
import { formatTimeOnly as formatTime } from '@/utils/date';

const props = defineProps<{
  task: TaskResponse;
  dayDate: Date;
  startOffsetMinutes: number;
}>();

const emit = defineEmits<{
  (e: 'update:task', patch: Partial<TaskResponse>): void;
  (e: 'delete'): void;
}>();

const { t } = useI18n();

const isDescriptionDialogOpen = ref(false);

// Get task time (reminder or end time)
const taskTime = computed(() => {
  return props.task.reminderDateTime || props.task.endDateTime || null;
});

const isEndTimeOnly = computed(() => !!props.task.endDateTime && !props.task.reminderDateTime);

const taskTimeISO = computed(() => (taskTime.value ? new Date(taskTime.value).toISOString() : ''));

const timeBadgeLabel = computed(() => {
  if (props.task.reminderDateTime) {
    return t('label.reminder_time');
  }
  if (props.task.endDateTime) {
    return t('label.end_time');
  }
  return t('label.time');
});

// Calculate card position based on time
// 每小時固定 60px，高度由分鐘數線性內插
const cardStyle = computed(() => {
  const baseHeightPerHour = 60; // px
  const cardGap = 6; // px gap between stacked cards
  const verticalCenterOffset = cardGap / 2;

  if (!taskTime.value) {
    return {
      top: '0px',
      height: `${baseHeightPerHour}px`,
      opacity: '0.5',
    };
  }

  const taskDate = new Date(taskTime.value);
  const hour = taskDate.getHours();
  const minute = taskDate.getMinutes();

  let minutesFromStart = hour * 60 + minute - (props.startOffsetMinutes ?? 0);
  if (isEndTimeOnly.value) {
    minutesFromStart -= baseHeightPerHour; // shift one hour earlier when only end time exists
  }
  const pxPerMinute = baseHeightPerHour / 60; // 1px per minute
  const top = `${Math.max(minutesFromStart, 0) * pxPerMinute + verticalCenterOffset}px`;

  // 先用 1 小時高度，未來若有 duration 再調整
  const height = `${baseHeightPerHour - cardGap}px`;

  return {
    top,
    height,
    left: '0.5rem',
    right: '0.5rem',
  };
});

const handleStatusUpdate = (status: TaskResponse['status']) => {
  emit('update:task', { status });
};
</script>

<style scoped>
.timeline-card__time {
  @apply relative overflow-hidden;
}

.timeline-card__time::before {
  @apply bg-white;

  content: '';
  position: absolute;
  inset: 4px 6px;
  border-radius: 0.5rem;
  z-index: 0;
}

.timeline-card__time > * {
  position: relative;
  z-index: 1;
}
</style>
