<template>
  <div class="flex h-full flex-col">
    <!-- Display Mode Tabs -->
    <div class="mb-2 flex items-center justify-between md:mb-0">
      <LegendIndicators :items="scheduleLegendItems" class="mr-2 hidden md:flex">
        <template #item="{ item }">
          <ElIcon v-if="item.type === 'reminder'" class="text-xs text-yellow-500">
            <Bell />
          </ElIcon>
          <ElIcon v-else-if="item.type === 'end'" class="text-xs text-blue-500">
            <Clock />
          </ElIcon>
          <span>{{ item.label }}</span>
        </template>
      </LegendIndicators>
      <PillTab
        :model-value="displayMode"
        :tabs="taskScheduleDisplayModeList"
        @update:model-value="$emit('update:displayMode', $event)"
      >
        <template #item="{ tab }">
          {{ t(`tab.schedule.${tab.value}`) }}
        </template>
      </PillTab>
    </div>

    <!-- Tasks Container -->
    <div ref="scrollContainer" class="flex-1 overflow-y-auto scroll-smooth">
      <ContentEmptyState
        v-if="groupedTasks.length === 0"
        class="h-full"
        :title="t('message.no_tasks')"
        :button-label="t('button.go_to_create_task')"
        button-to="/app/todo/projects"
      />

      <div v-else class="space-y-8 p-1 md:p-4">
        <template v-for="(group, index) in groupedTasks" :key="group.dateKey">
          <DayGroup
            :group="group"
            :show-break-line="
              index > 0 && !isConsecutiveDate(groupedTasks[index - 1].date, group.date)
            "
            :expanded-task-ids="expandedTaskIds"
            @update:expanded="updateTaskExpanded"
            @update:task="handleUpdateTask"
            @delete="handleDeleteTask"
            @set-ref="setDayRef"
          />
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Bell, Clock } from '@element-plus/icons-vue';
import { ElIcon } from 'element-plus';
import { computed, nextTick, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import DayGroup from './DayGroup.vue';

import type { TaskResponse } from '@/types/response';

import ContentEmptyState from '@/components/core/ContentEmptyState.vue';
import PillTab from '@/components/core/tab/PillTab.vue';
import LegendIndicators from '@/components/ui/LegendIndicators.vue';
import { TaskScheduleDisplayMode } from '@/types/task';
import { formatDate as formatDateKey, isConsecutiveDate } from '@/utils/date';
import { groupTasksByDate } from '@/utils/scheduleGroupUtils';

const props = defineProps<{
  tasks: TaskResponse[];
  selectedDate: Date;
  displayMode: TaskScheduleDisplayMode;
}>();

const emit = defineEmits<{
  (e: 'update:task', taskId: string, patch: Partial<TaskResponse>): void;
  (e: 'delete', taskId: string): void;
  (e: 'update:displayMode', mode: TaskScheduleDisplayMode): void;
}>();

const { t } = useI18n();

const scrollContainer = ref<HTMLElement | null>(null);
const dayRefs = ref<Map<string, HTMLElement>>(new Map());
const expandedTaskIds = ref<Set<string>>(new Set());

const taskScheduleDisplayModeList = computed(() => [
  { value: TaskScheduleDisplayMode.All },
  { value: TaskScheduleDisplayMode.ReminderDateTime },
  { value: TaskScheduleDisplayMode.EndDateTime },
]);

const scheduleLegendItems = computed(() => [
  { type: 'reminder', label: t('label.reminder_date_time') },
  { type: 'end', label: t('label.end_date_time') },
]);
const groupedTasks = computed(() => groupTasksByDate(props.tasks, t, props.displayMode));

const setDayRef = (dateKey: string, el: HTMLElement) => {
  if (el) {
    dayRefs.value.set(dateKey, el);
  }
};

const updateTaskExpanded = (taskId: string, value: boolean) => {
  if (value) {
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

// Scroll to selected date
watch(
  () => props.selectedDate,
  async (newDate) => {
    await nextTick();
    const dateKey = formatDateKey(newDate);
    const element = dayRefs.value.get(dateKey);

    if (element && scrollContainer.value) {
      const containerTop = scrollContainer.value.getBoundingClientRect().top;
      const elementTop = element.getBoundingClientRect().top;
      const scrollOffset = elementTop - containerTop;

      scrollContainer.value.scrollBy({
        top: scrollOffset - 20,
        behavior: 'smooth',
      });
    }
  },
  { immediate: false }
);
</script>
