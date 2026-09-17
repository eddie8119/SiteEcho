import type { TaskResponse } from '@/types/response';

import { TaskStatusEnum } from '@/types/task';
import { TaskTimeAlertStatus } from '@/types/task';

/**
 * 檢查任務的提醒狀態
 * @param task - 要檢查的任務對象
 * @returns TaskTimeAlertStatus
 */
export function getTaskTimeAlertStatus(task: TaskResponse): TaskTimeAlertStatus {
  // 如果任務已施作完成，則沒有任何時間狀態
  if (task.status === TaskStatusEnum.DONE) {
    return TaskTimeAlertStatus.NONE;
  }

  const now = new Date();

  // 1. 檢查逾期狀態 (基於 endDateTime，精確到「當下時間」)
  if (task.endDateTime) {
    const endDateTime = new Date(task.endDateTime);
    if (endDateTime.getTime() < now.getTime()) {
      return TaskTimeAlertStatus.OVERDUE;
    }
  }

  // 2. 檢查提醒狀態 (基於 reminderDateTime)
  if (task.reminderDateTime) {
    const reminderTime = new Date(task.reminderDateTime);
    // 如果提醒時間已過，就觸發提醒
    if (reminderTime <= new Date()) {
      return TaskTimeAlertStatus.REMINDING;
    }
  }

  // 3. 如果以上條件都不滿足，則無狀態
  return TaskTimeAlertStatus.NONE;
}

// 逾期狀態：檢查 endDateTime。如果 endDateTime 早於今天，任務會被標記為 OVERDUE。
// 提醒狀態：如果任務未逾期，接著檢查 reminderDateTime。如果當前時間已經超過了設定的提醒時間，任務會被標記為 REMINDING
