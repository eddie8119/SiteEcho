import { onBeforeUnmount, onMounted } from 'vue';

import type { ProjectResponse, TaskResponse } from '@/types/response';
import type { CreateProjectSchema } from '@/utils/schemas/createProjectSchema';
import type { Ref } from 'vue';

export function useProjectSaving(
  projectId: string,
  localProject: Ref<ProjectResponse | null>,
  localTasks: Ref<TaskResponse[] | null>,
  hasProjectChanges: Ref<boolean>,
  hasTasksChanges: Ref<boolean>,
  updateProject: (project: Partial<CreateProjectSchema>) => Promise<ProjectResponse | null>,
  updateProjectTasks: (tasks: TaskResponse[]) => Promise<TaskResponse[] | null>
) {
  // 處理窗口關閉事件
  const handleBeforeUnload = async (event: BeforeUnloadEvent): Promise<void> => {
    event.preventDefault();

    if (hasProjectChanges.value && localProject.value) {
      try {
        const url = `/api/projects/${projectId}`;
        const data = new Blob([JSON.stringify(localProject.value)], { type: 'application/json' });
        navigator.sendBeacon(url, data);

        updateProject(localProject.value as Partial<CreateProjectSchema>)
          .then(() => {
            hasProjectChanges.value = false;
          })
          .catch((error) => {
            console.error('保存數據失敗:', error);
          });
      } catch (error) {
        console.error('窗口關閉或刷新時保存數據失敗:', error);
      }
    }
  };

  // 保存所有數據
  const saveAllData = async () => {
    if (hasProjectChanges.value && localProject.value) {
      await updateProject(localProject.value as Partial<CreateProjectSchema>);
      hasProjectChanges.value = false;
    }
    if (hasTasksChanges.value && localTasks.value) {
      await updateProjectTasks(localTasks.value);
      hasTasksChanges.value = false;
    }
  };

  // 自動保存設置
  let autoSaveInterval: number | null = null;

  onMounted(() => {
    autoSaveInterval = window.setInterval(saveAllData, 5 * 60 * 1000);
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeUnmount(() => {
    if (autoSaveInterval !== null) clearInterval(autoSaveInterval);
    window.removeEventListener('beforeunload', handleBeforeUnload);
    saveAllData();
  });

  return { saveAllData, handleBeforeUnload };
}
