import type { TaskResponse } from '@/types/response';
import type { Ref } from 'vue';

export function useTaskUpdates(
  tasks: Ref<TaskResponse[] | null>,
  saveTasksToLocalStorage: () => void,
  updateLastUpdateTime: () => void
) {
  // 更新專案下所有任務
  const updateProjectAllTasks = (updatedTasksData: TaskResponse[]) => {
    if (tasks.value) {
      tasks.value = updatedTasksData;
      saveTasksToLocalStorage();
      updateLastUpdateTime();
    }
  };

  return {
    updateProjectAllTasks,
  };
}
