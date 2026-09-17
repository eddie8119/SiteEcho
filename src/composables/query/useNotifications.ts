import { useQuery } from '@tanstack/vue-query';
import { type Ref, ref } from 'vue';

import type { TaskResponse } from '@/types/response';

import { notificationApi } from '@/api/notification';

interface UseNotificationsReturn {
  // 獲取待發送提醒的任務列表
  isLoadingReminders: Ref<boolean>;
  error: Ref<Error | null>;
  pendingReminders: Ref<TaskResponse[] | undefined>;
  refetchReminders: () => Promise<void>;
  remindersUpdatedAt: Ref<number>;

  // 手動觸發檢查提醒
  checkReminders: () => Promise<{ success: boolean; count: number } | null>;
  isChecking: Ref<boolean>;
  checkError: Ref<Error | null>;

  // 重置任務的提醒狀態
  resetReminderStatus: (taskId: string) => Promise<boolean>;
  isResetting: Ref<boolean>;
  resetError: Ref<Error | null>;
}

export function useNotifications(): UseNotificationsReturn {
  // 用於追蹤操作狀態
  const isChecking = ref(false);
  const checkError = ref<Error | null>(null);
  const isResetting = ref(false);
  const resetError = ref<Error | null>(null);

  // 獲取待發送提醒的任務列表
  const {
    data: pendingReminders,
    isLoading: isLoadingReminders,
    refetch: refetchQueryReminders,
    error,
    dataUpdatedAt: remindersUpdatedAt,
  } = useQuery({
    queryKey: ['pending-reminders'],
    queryFn: async () => {
      const response = await notificationApi.getPendingReminders();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分鐘
    gcTime: 1000 * 60 * 10, // 10分鐘
  });

  // 重新獲取提醒列表
  const refetchReminders = async (): Promise<void> => {
    await refetchQueryReminders();
  };

  // 手動觸發檢查提醒
  const checkReminders = async (): Promise<{ success: boolean; count: number } | null> => {
    try {
      isChecking.value = true;
      checkError.value = null;

      const response = await notificationApi.checkReminders();
      await refetchReminders(); // 刷新列表
      return response.data || null;
    } catch (err: unknown) {
      checkError.value = err instanceof Error ? err : new Error(String(err));
      console.error('檢查提醒失敗:', err);
      return null;
    } finally {
      isChecking.value = false;
    }
  };

  // 重置任務的提醒狀態
  const resetReminderStatus = async (taskId: string): Promise<boolean> => {
    try {
      isResetting.value = true;
      resetError.value = null;

      await notificationApi.resetReminderStatus(taskId);
      await refetchReminders(); // 刷新列表
      return true;
    } catch (err: unknown) {
      resetError.value = err instanceof Error ? err : new Error(String(err));
      console.error('重置提醒狀態失敗:', err);
      return false;
    } finally {
      isResetting.value = false;
    }
  };

  return {
    // 獲取待發送提醒的任務列表
    isLoadingReminders,
    error,
    pendingReminders,
    refetchReminders,
    remindersUpdatedAt,

    // 手動觸發檢查提醒
    checkReminders,
    isChecking,
    checkError,

    // 重置任務的提醒狀態
    resetReminderStatus,
    isResetting,
    resetError,
  };
}
