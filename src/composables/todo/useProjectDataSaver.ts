import { onBeforeUnmount, onMounted, ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';

import type { TaskResponse } from '@/types/response';
import type { Ref } from 'vue';

/**
 * @composable useProjectDataSaver
 *
 * @description
 * 處理專案任務的自動保存邏輯（無 localStorage / sendBeacon）
 * - 監聽任務變更 flag
 * - 定期自動保存（可設定間隔）
 * - 路由離開前保存
 * - 組件卸載前保存
 *
 * @param {Ref<TaskResponse[]>} tasksRef - 任務陣列的響應式引用
 * @param {Function} updateProjectTasksApi - 批次更新任務的 API 函數
 * @param {number} autoSaveInterval - 自動保存間隔（毫秒），預設 3 分鐘
 */
export function useProjectDataSaver(
  tasksRef: Ref<TaskResponse[]>,
  updateProjectTasksApi: (tasks: TaskResponse[]) => Promise<TaskResponse[] | null>,
  autoSaveInterval: number = 3 * 60 * 1000 // 預設 3 分鐘
) {
  // 內部狀態
  const hasTasksChanges = ref(false);
  const isSaving = ref(false);
  const lastSavedAt = ref<number | null>(null);
  let autoSaveTimerId: number | null = null;

  /**
   * 標記任務已變更
   */
  const markTasksChanged = () => {
    hasTasksChanges.value = true;
  };

  /**
   * 儲存任務資料
   */
  const saveData = async (): Promise<void> => {
    // 防止重入
    if (isSaving.value) {
      return;
    }

    // 若無變更則跳過
    if (!hasTasksChanges.value) {
      return;
    }

    // 若無任務則跳過
    if (!tasksRef.value || tasksRef.value.length === 0) {
      hasTasksChanges.value = false;
      return;
    }

    isSaving.value = true;

    try {
      await updateProjectTasksApi(tasksRef.value);
      hasTasksChanges.value = false;
      lastSavedAt.value = Date.now();
    } catch (error) {
      console.error('儲存任務失敗:', error);
      // 保留 hasTasksChanges = true，下次繼續嘗試
    } finally {
      isSaving.value = false;
    }
  };

  /**
   * 手動觸發儲存（例如使用者按儲存按鈕）
   */
  const saveNow = async (): Promise<void> => {
    await saveData();
  };

  // ==================== 生命週期掛鉤 ====================

  onMounted(() => {
    // 設置定期自動保存
    if (autoSaveInterval > 0) {
      autoSaveTimerId = window.setInterval(() => {
        if (hasTasksChanges.value) {
          saveData();
        }
      }, autoSaveInterval);
    }
  });

  onBeforeUnmount(async () => {
    // 卸載前儲存
    await saveData();

    // 清除定時器
    if (autoSaveTimerId !== null) {
      clearInterval(autoSaveTimerId);
      autoSaveTimerId = null;
    }
  });

  onBeforeRouteLeave(async (_, __, next) => {
    // 路由離開前儲存
    await saveData();
    next();
  });

  return {
    // 狀態
    isSaving,
    hasTasksChanges,
    lastSavedAt,
    // 方法
    markTasksChanged,
    saveNow,
  };
}
