import { onMounted, watch } from 'vue';

import type { ProjectResponse, TaskResponse } from '@/types/response';
import type { Ref } from 'vue';

export function useProjectInitialization(
  fetchedProject: Ref<ProjectResponse | null>,
  fetchedTasks: Ref<TaskResponse[] | null>,
  localProject: Ref<ProjectResponse | null>,
  localTasks: Ref<TaskResponse[] | null>,
  initLocalProject: () => void,
  initLocalTasks: () => void
) {
  // 監聽資料庫數據變化並初始化本地數據
  watch(
    [() => fetchedProject.value, () => fetchedTasks.value],
    ([newProject, newTasks]) => {
      if (newProject) initLocalProject();
      if (newTasks) initLocalTasks();
    },
    { immediate: true }
  );

  // 強制重新渲染函數
  const forceRerender = () => {
    setTimeout(() => {
      if (localProject.value) {
        const temp = { ...localProject.value };
        localProject.value = null;
        localProject.value = temp;
      }
      if (localTasks.value) {
        const temp = { ...localTasks.value };
        localTasks.value = null;
        localTasks.value = temp;
      }
    }, 100);
  };

  onMounted(() => {
    if (fetchedProject.value && !localProject.value) {
      initLocalProject();
      initLocalTasks();
    }
    forceRerender();
  });
}
