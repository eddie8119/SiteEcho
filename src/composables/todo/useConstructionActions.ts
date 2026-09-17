import type { TaskResponse } from '@/types/response';
import type { ConstructionSelection } from '@/types/selection';
import type { Ref } from 'vue';

export function useConstructionActions(
  containersRef: Ref<ConstructionSelection[]>,
  updateCallback: (newContainers: ConstructionSelection[]) => void,
  options?: {
    tasksRef?: Ref<TaskResponse[]>;
    deleteTaskFromApi?: (taskId: string) => Promise<boolean>;
    deleteTaskFromState?: (taskId: string) => void;
    filterTasksByConstruction?: (tasks: TaskResponse[], constructionId: string) => TaskResponse[];
  }
) {
  // 刪除容器
  const deleteConstruction = (index: number) => {
    containersRef.value = containersRef.value.filter((_, i) => i !== index);
    updateCallback(containersRef.value);
  };

  // 添加新容器（支援單筆或多筆）
  const addNewConstruction = (constructions: ConstructionSelection | ConstructionSelection[]) => {
    const constructionsArray = Array.isArray(constructions) ? constructions : [constructions];

    if (constructionsArray.length > 0) {
      containersRef.value = [...containersRef.value, ...constructionsArray];
      updateCallback(containersRef.value);
    }
  };

  // 更新容器名稱
  const updateConstructionName = (index: number, newName: string) => {
    if (index >= 0 && index < containersRef.value.length) {
      containersRef.value = containersRef.value.map((container, i) =>
        i === index ? { ...container, name: newName } : container
      );
      updateCallback(containersRef.value);
    }
  };

  /**
   * 刪除容器及其內部所有任務
   * @param index - 容器索引
   * @param showConfirm - 是否顯示確認對話框（默認為 true）
   */
  const deleteConstructionWithTasks = async (
    index: number,
    showConfirm = true
  ): Promise<boolean> => {
    const container = containersRef.value[index];
    if (!container) return false;

    // 如果沒有提供任務相關的選項，則直接刪除容器
    if (
      !options?.tasksRef ||
      !options?.deleteTaskFromApi ||
      !options?.deleteTaskFromState ||
      !options?.filterTasksByConstruction
    ) {
      deleteConstruction(index);
      return true;
    }

    // 獲取該容器內的所有任務
    const tasksInContainer = options.filterTasksByConstruction(
      options.tasksRef.value,
      container.id
    );

    // 如果容器內有任務，顯示警告確認
    if (tasksInContainer.length > 0) {
      if (showConfirm) {
        const confirmed = confirm(
          `此工程類型「${container.name}」內有 ${tasksInContainer.length} 個任務。\n刪除後將無法復原，確定要刪除嗎？`
        );
        if (!confirmed) return false;
      }

      try {
        // 使用 Promise.all 並行刪除所有任務
        const deletePromises = tasksInContainer.map((task) => options.deleteTaskFromApi!(task.id));
        await Promise.all(deletePromises);

        // 從本地狀態中移除這些任務
        tasksInContainer.forEach((task) => {
          options.deleteTaskFromState!(task.id);
        });
      } catch (error) {
        console.error('刪除任務失敗:', error);
        return false;
      }
    }

    // 刪除容器
    deleteConstruction(index);
    return true;
  };

  return {
    deleteConstruction,
    addNewConstruction,
    updateConstructionName,
    deleteConstructionWithTasks,
  };
}
