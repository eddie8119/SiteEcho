import type { TaskResponse } from '@/types/response';
import type { Ref } from 'vue';

/**
 * @composable useTaskOperations
 *
 * @description
 * 處理任務的 CRUD 操作邏輯
 * 提供統一的任務管理接口
 *
 * @param tasksRef - 任務陣列的響應式引用
 * @param updateCallback - 任務更新後的回調函數
 */
export function useTaskOperations(
  tasksRef: Ref<TaskResponse[]>,
  updateCallback: (tasks: TaskResponse[]) => void
) {
  /**
   * 查找任務索引
   */
  const findTaskIndex = (taskId: string): number => {
    return tasksRef.value.findIndex((task) => task.id === taskId);
  };

  /**
   * 刪除任務
   */
  const deleteTask = (taskId: string): void => {
    const taskIndex = findTaskIndex(taskId);
    if (taskIndex === -1) return;

    tasksRef.value = tasksRef.value.filter((task) => task.id !== taskId);
    updateCallback(tasksRef.value);
  };

  /**
   * 新增任務
   */
  const addNewTask = (newTaskData: TaskResponse): void => {
    tasksRef.value = [...tasksRef.value, newTaskData];
    updateCallback(tasksRef.value);
  };

  /**
   * 更新任務（優化版本：直接索引更新，避免 map 遍歷）
   */
  const updateTask = (taskId: string, updatedTask: Partial<TaskResponse>): void => {
    const taskIndex = findTaskIndex(taskId);
    if (taskIndex === -1) return;

    // 直接更新索引位置的任務，避免 map 遍歷整個陣列
    tasksRef.value[taskIndex] = {
      ...tasksRef.value[taskIndex],
      ...updatedTask,
    };

    updateCallback(tasksRef.value);
  };

  /**
   * 批量更新任務
   */
  const batchUpdateTasks = (updates: Array<{ id: string; data: Partial<TaskResponse> }>): void => {
    const taskMap = new Map(tasksRef.value.map((task) => [task.id, task]));

    updates.forEach(({ id, data }) => {
      const task = taskMap.get(id);
      if (task) {
        taskMap.set(id, { ...task, ...data });
      }
    });

    tasksRef.value = Array.from(taskMap.values());
    updateCallback(tasksRef.value);
  };

  return {
    deleteTask,
    addNewTask,
    updateTask,
    batchUpdateTasks,
    findTaskIndex,
  };
}
