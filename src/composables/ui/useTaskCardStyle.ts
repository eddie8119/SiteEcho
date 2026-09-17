import { computed, type Ref } from 'vue';

import type { TaskResponse } from '@/types/response';

import { TaskStatusEnum } from '@/types/task';
import { TaskTimeAlertStatus } from '@/types/task';
import { getTaskTimeAlertStatus } from '@/utils/taskReminder';

export function useTaskCardStyle(task: Ref<TaskResponse>) {
  // Alert
  const timeAlertStatus = computed(() => getTaskTimeAlertStatus(task.value));

  const timeAlertClasses = computed(() => {
    switch (timeAlertStatus.value) {
      case TaskTimeAlertStatus.OVERDUE:
        return 'border-2 border-dashed border-secondary-red bg-red-100 dark:bg-red-900';
      case TaskTimeAlertStatus.REMINDING:
        return 'border-2 border-dashed border-secondary-yellow bg-yellow-100 dark:bg-yellow-800';
      default:
        return '';
    }
  });

  const timeAlertAreaClasses = computed(() => {
    switch (timeAlertStatus.value) {
      case TaskTimeAlertStatus.OVERDUE:
        return 'bg-secondary-red ';
      case TaskTimeAlertStatus.REMINDING:
        return 'bg-secondary-yellow text-black-900';
      default:
        return '';
    }
  });

  // 完成任務的樣式
  const taskStatusClasses = computed(() => {
    switch (task.value.status) {
      case TaskStatusEnum.DONE:
        return 'bg-green-100 dark:bg-green-900';
      default:
        return '';
    }
  });

  return {
    timeAlertStatus,
    timeAlertClasses,
    timeAlertAreaClasses,
    taskStatusClasses,
  } as const;
}
