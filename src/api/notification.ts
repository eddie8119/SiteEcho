import type { ApiResponse } from '@/types/request';
import type { TaskResponse } from '@/types/response';

import request from '@/utils/request';

export const notificationApi = {
  // 手動觸發檢查需要發送的提醒
  checkReminders: (): Promise<ApiResponse<{ success: boolean; count: number }>> => {
    return request.post('/notifications/check-reminders');
  },

  //獲取待發送提醒的任務列表
  getPendingReminders: (): Promise<ApiResponse<TaskResponse[]>> => {
    return request.get('/notifications/pending-reminders');
  },

  //重置任務的提醒狀態
  resetReminderStatus: (taskId: string): Promise<ApiResponse<void>> => {
    return request.post(`/notifications/reset-reminder/${taskId}`);
  },
};
