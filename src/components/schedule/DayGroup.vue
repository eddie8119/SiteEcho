<template>
  <!-- Break Line for Non-Consecutive Dates -->
  <div v-if="showBreakLine" class="break-line-vertical" />

  <div :ref="setDayRef" class="relative z-0 scroll-mt-5">
    <!-- Compact View (Default) -->
    <template v-if="!isTimelineMode || !canToggleTimeline">
      <div class="flex flex-row items-start gap-4 lg:flex-col">
        <DayHeader
          :group="group"
          :is-timeline-mode="isTimelineMode"
          :can-toggle-timeline="canToggleTimeline"
          mode="compact"
          @toggle="toggleTimelineMode"
        />

        <div
          class="task-container relative z-20 flex flex-1 flex-nowrap gap-2 overflow-x-auto sm:gap-3"
        >
          <div
            v-for="task in group.tasks"
            :key="task.id"
            data-task-card
            class="transition-opacity duration-75"
          >
            <TaskCardItem
              :task="task"
              :expanded="expandedTaskIds.has(task.id)"
              @update:expanded="(value) => updateTaskExpanded(task.id, value)"
              @update:task="handleUpdateTask"
              @delete="handleDeleteTask"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Timeline View -->
    <template v-else>
      <div class="timeline-wrapper">
        <!-- Timeline Header - Clickable to toggle back to compact view -->
        <DayHeader
          :group="group"
          :is-timeline-mode="isTimelineMode"
          :can-toggle-timeline="canToggleTimeline"
          mode="timeline"
          @toggle="toggleTimelineMode"
        />

        <DayTimelineView
          :group="group"
          @update:task="handleUpdateTask"
          @delete="handleDeleteTask"
        />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import {
  type ComponentPublicInstance,
  computed,
  onDeactivated,
  onMounted,
  onUnmounted,
  ref,
} from 'vue';

import DayHeader from './DayHeader.vue';
import DayTimelineView from './DayTimelineView.vue';
import TaskCardItem from './TaskCardItem.vue';

import type { TaskResponse } from '@/types/response';
import type { DayGroup as DayGroupType } from '@/utils/scheduleGroupUtils';

const props = defineProps<{
  group: DayGroupType;
  showBreakLine: boolean;
  expandedTaskIds: Set<string>;
}>();

const emit = defineEmits<{
  (e: 'update:expanded', taskId: string, value: boolean): void;
  (e: 'update:task', taskId: string, patch: Partial<TaskResponse>): void;
  (e: 'delete', taskId: string): void;
  (e: 'set-ref', dateKey: string, el: HTMLElement): void;
}>();

const dayRef = ref<HTMLElement | null>(null);
const headerRef = ref<HTMLElement | null>(null);
const taskContainerRef = ref<HTMLElement | null>(null);
const isTimelineMode = ref(false);

const canToggleTimeline = computed(() => props.group.tasks.length > 1);

const setDayRef = (el: Element | ComponentPublicInstance | null) => {
  if (!el) return;

  const element =
    el instanceof HTMLElement ? el : ((el as ComponentPublicInstance).$el as HTMLElement | null);

  if (!element) return;

  dayRef.value = element;
  emit('set-ref', props.group.dateKey, element);
};

const toggleTimelineMode = () => {
  isTimelineMode.value = !isTimelineMode.value;
};

const updateTaskExpanded = (taskId: string, value: boolean) => {
  emit('update:expanded', taskId, value);
};

const handleUpdateTask = (taskId: string, patch: Partial<TaskResponse>) => {
  emit('update:task', taskId, patch);
};

const handleDeleteTask = (taskId: string) => {
  emit('delete', taskId);
};

onDeactivated(() => {
  // 避免返回頁面後仍留在時間軸模式
  isTimelineMode.value = false;
});

// 計算任務卡片與 header 的距離，動態調整透明度
const updateTaskOpacity = () => {
  if (!headerRef.value || !taskContainerRef.value) return;

  const headerRect = headerRef.value.getBoundingClientRect();
  const headerBottom = headerRect.bottom;
  const fadeDistance = 120; // 漸層距離（像素）

  const taskCards = taskContainerRef.value.querySelectorAll('[data-task-card]');
  taskCards.forEach((card) => {
    const cardRect = card.getBoundingClientRect();
    const cardTop = cardRect.top;
    const distance = cardTop - headerBottom;

    // 計算透明度：距離越近越透明
    // 只有當卡片進入 header 下方的漸層區域時才改變透明度
    let opacity = 1;
    if (distance < 0) {
      // 卡片已經進入 header 區域，開始漸層
      opacity = Math.max(0, (distance + fadeDistance) / fadeDistance);
    }

    (card as HTMLElement).style.opacity = opacity.toString();
  });
};

onMounted(() => {
  // 初始化 refs
  if (dayRef.value) {
    headerRef.value = dayRef.value.querySelector('.date-header') as HTMLElement;
    taskContainerRef.value = dayRef.value.querySelector('.task-container') as HTMLElement;
  }

  // 尋找滾動容器（向上查找 overflow-y-auto 的父元素）
  let scrollContainer: Element | Window = window;
  if (dayRef.value) {
    let current: Element | null = dayRef.value;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollContainer = current;
        break;
      }
      current = current.parentElement;
    }
  }

  // 監聽滾動事件
  scrollContainer.addEventListener('scroll', updateTaskOpacity, { passive: true });

  // 初始計算一次
  updateTaskOpacity();
});

onUnmounted(() => {
  // 尋找滾動容器
  let scrollContainer: Element | Window = window;
  if (dayRef.value) {
    let current: Element | null = dayRef.value;
    while (current) {
      const style = window.getComputedStyle(current);
      if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
        scrollContainer = current;
        break;
      }
      current = current.parentElement;
    }
  }

  scrollContainer.removeEventListener('scroll', updateTaskOpacity);
});
</script>
