<template>
  <div class="relative z-20 flex h-full w-full flex-col">
    <div
      class="schedule-table grid flex-1 grid-cols-[80px_minmax(0,_1fr)] grid-rows-[auto_1fr] overflow-hidden rounded-lg"
    >
      <!-- Empty cell for time column header -->
      <div class="schedule-table__corner col-start-1 row-start-1" aria-hidden="true" />

      <!-- Project headers row -->
      <div
        v-if="projectColumns.length"
        ref="projectHeaderRef"
        class="schedule-table__header col-start-2 row-start-1 grid h-12 auto-cols-[280px] grid-flow-col overflow-x-auto"
      >
        <div
          v-for="column in projectColumns"
          :key="column.projectId"
          class="schedule-table__header-cell flex items-center p-2"
          :title="column.title"
        >
          <ProjectLink :project-id="column.projectId">
            {{ column.title }}
          </ProjectLink>
        </div>
      </div>

      <!-- Time Column -->
      <div
        class="schedule-table__left-column sticky left-0 col-start-1 row-start-2 flex h-full w-20 flex-col"
      >
        <div
          class="schedule-table__right-header flex h-12 items-center justify-center text-sm font-semibold"
        />
        <div
          v-for="hour in hours"
          :key="hour"
          class="schedule-table__time-row flex h-[60px] items-start justify-center pt-2 text-xs"
        >
          <span class="font-medium">{{ formatHour(hour) }}</span>
        </div>
      </div>

      <!-- Tasks Column -->
      <section ref="tasksColumnRef" class="relative col-start-2 row-start-2 flex-1 overflow-auto">
        <div class="relative min-h-full min-w-full">
          <!-- Grid Background -->
          <div class="pointer-events-none absolute inset-x-0 bottom-0 top-12">
            <div
              v-for="hour in hours"
              :key="`grid-${hour}`"
              class="schedule-table__grid-row h-[60px]"
            />
          </div>

          <!-- Column Guides -->
          <div
            class="timeline-column-guides pointer-events-none absolute inset-x-0 bottom-0 top-0"
          />

          <!-- Tasks grouped by project -->
          <ol
            class="schedule-table__body relative z-10 grid h-full auto-cols-[280px] grid-flow-col pt-12"
          >
            <li v-for="column in projectColumns" :key="column.projectId" class="flex h-full px-2">
              <div class="relative h-full min-h-full w-full">
                <TimelineTaskCard
                  v-for="task in column.tasks"
                  :key="task.id"
                  :task="task"
                  :day-date="group.date"
                  :start-offset-minutes="startOffsetMinutes"
                  @update:task="handleUpdateTask(task.id, $event)"
                  @delete="handleDeleteTask(task.id)"
                />
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import TimelineTaskCard from './TimelineTaskCard.vue';

import type { ProjectTitle } from '@/types/project';
import type { TaskResponse } from '@/types/response';
import type { DayGroup as DayGroupType } from '@/utils/scheduleGroupUtils';

import ProjectLink from '@/components/core/link/ProjectLink.vue';
import { useProjectTitleListContext } from '@/context/useProjectTitleListContext';

const props = defineProps<{
  group: DayGroupType;
}>();

const emit = defineEmits<{
  (e: 'update:task', taskId: string, patch: Partial<TaskResponse>): void;
  (e: 'delete', taskId: string): void;
}>();

const { projectTitleList } = useProjectTitleListContext();

const tasksColumnRef = ref<HTMLDivElement | null>(null);
const projectHeaderRef = ref<HTMLDivElement | null>(null);

let isSyncingScroll = false;

const syncFromTasks = () => {
  if (!tasksColumnRef.value || !projectHeaderRef.value || isSyncingScroll) return;
  isSyncingScroll = true;
  projectHeaderRef.value.scrollLeft = tasksColumnRef.value.scrollLeft;
  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
};

const syncFromHeader = () => {
  if (!tasksColumnRef.value || !projectHeaderRef.value || isSyncingScroll) return;
  isSyncingScroll = true;
  tasksColumnRef.value.scrollLeft = projectHeaderRef.value.scrollLeft;
  requestAnimationFrame(() => {
    isSyncingScroll = false;
  });
};

watch(
  [tasksColumnRef, projectHeaderRef],
  ([tasksEl, headerEl], [prevTasks, prevHeader]) => {
    prevTasks?.removeEventListener('scroll', syncFromTasks);
    prevHeader?.removeEventListener('scroll', syncFromHeader);

    tasksEl?.addEventListener('scroll', syncFromTasks, { passive: true });
    headerEl?.addEventListener('scroll', syncFromHeader, { passive: true });

    syncFromTasks();
  },
  { immediate: true }
);

onBeforeUnmount(() => {
  tasksColumnRef.value?.removeEventListener('scroll', syncFromTasks);
  projectHeaderRef.value?.removeEventListener('scroll', syncFromHeader);
});

const getTaskTime = (task: TaskResponse): Date | null => {
  if (task.reminderDateTime) return new Date(task.reminderDateTime);
  if (task.endDateTime) return new Date(task.endDateTime);
  return null;
};

// 依照當日任務實際時間，計算要顯示的起訖小時範圍
const hours = computed(() => {
  const times = props.group.tasks
    .map((task) => getTaskTime(task))
    .filter((d): d is Date => d !== null);

  if (times.length === 0) {
    return Array.from({ length: 24 }, (_, i) => i);
  }

  const hoursList = times.map((d) => d.getHours());
  const minHour = Math.min(...hoursList);
  const maxHour = Math.max(...hoursList);

  // 往前/往後各留一小時當緩衝
  const startHour = Math.max(0, minHour - 1);
  const endHour = Math.min(23, maxHour + 1);

  const result: number[] = [];
  for (let h = startHour; h <= endHour; h += 1) {
    result.push(h);
  }
  return result;
});

// 給卡片用的起始分鐘偏移（讓 startHour 對齊 0px）
const startOffsetMinutes = computed(() => {
  if (hours.value.length === 0) return 0;
  return hours.value[0] * 60;
});

const formatHour = (hour: number): string => {
  return `${hour.toString().padStart(2, '0')}:00`;
};

// 依專案分 column，供模板渲染
const projectColumns = computed(() => {
  const groups = new Map<string, { tasks: TaskResponse[]; title?: string }>();

  for (const task of props.group.tasks) {
    const taskWithProject = task as TaskResponse & { projectId?: string; projectTitle?: string };
    const projectId = taskWithProject.projectId ?? 'unknown';
    const projectTitle = taskWithProject.projectTitle;

    if (!groups.has(projectId)) {
      const providedTitle = projectTitleList.value.find(
        (p: ProjectTitle) => p.id === projectId
      )?.title;
      groups.set(projectId, { tasks: [], title: projectTitle ?? providedTitle });
    }

    const group = groups.get(projectId);
    if (group) {
      group.tasks.push(task);
      // 如果目前尚無標題且任務帶有 projectTitle，就更新
      if (!group.title && projectTitle) {
        group.title = projectTitle;
      }
    }
  }

  return Array.from(groups.entries()).map(([projectId, data]) => ({
    projectId,
    title: data.title,
    tasks: data.tasks,
  }));
});

const handleUpdateTask = (taskId: string, patch: Partial<TaskResponse>) => {
  emit('update:task', taskId, patch);
};

const handleDeleteTask = (taskId: string) => {
  emit('delete', taskId);
};
</script>

<style scoped>
:global(:root) {
  --timeline-column-guide: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 279px,
    rgb(226 232 240 / 100%) 279px,
    rgb(226 232 240 / 100%) 280px
  );
}

:global(.dark) {
  --timeline-column-guide: repeating-linear-gradient(
    90deg,
    transparent,
    transparent 279px,
    rgb(55 65 81 / 90%) 279px,
    rgb(55 65 81 / 90%) 280px
  );
}

.timeline-column-guides {
  background-image: var(--timeline-column-guide);
  background-size: 280px 100%;
  background-position: 0 0;
}
</style>
