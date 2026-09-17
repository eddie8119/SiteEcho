/**
 * 用於管理專案相關操作
 * 包含建立、更新、刪除、分享等功能
 *
 * @returns {Object}
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { storeToRefs } from 'pinia';
import { type Ref } from 'vue';

import type { ProjectResponse } from '@/types/response';
import type { CreateProjectSchema } from '@/utils/schemas/createProjectSchema';

import { projectApi } from '@/api/project';
import { useProjectsStore } from '@/stores/useProjectsStore';

interface UseProjectReturn {
  // 獲取專案資料
  fetchedProject: Ref<ProjectResponse | undefined>;
  isLoadingProject: Ref<boolean>;
  projectError: Ref<Error | null>;
  refetchProject: () => Promise<void>;

  // 建立專案
  createProject: (data: CreateProjectSchema) => Promise<ProjectResponse | null>;
  isCreatingProject: Ref<boolean>;
  createProjectError: Ref<Error | null>;

  // 更新專案
  updateProject: (data: Partial<CreateProjectSchema>) => Promise<ProjectResponse | null>;
  isUpdatingProject: Ref<boolean>;
  updateProjectError: Ref<Error | null>;

  // 刪除專案
  deleteProject: (id: string) => Promise<void>;
  isDeletingProject: Ref<boolean>;
  deleteProjectError: Ref<Error | null>;

  // 切換專案分享狀態
  toggleProjectShare: () => Promise<ProjectResponse | null>;
  isTogglingShare: Ref<boolean>;
  toggleProjectShareError: Ref<Error | null>;
}

const QUERY_KEY = 'project';

export function useProject(id?: string): UseProjectReturn {
  const queryClient = useQueryClient();
  const projectsStore = useProjectsStore();
  const { projects } = storeToRefs(projectsStore);

  // ==================== 獲取專案資料 ====================
  const {
    data: fetchedProject,
    isLoading: isLoadingProject,
    refetch: refetchQueryProject,
    error: projectError,
  } = useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) throw new Error('Project ID is required');
      const response = await projectApi.getProjectById(id);
      return response.data;
    },
    enabled: !!id,
    staleTime: 1000 * 60 * 3,
  });

  const refetchProject = async (): Promise<void> => {
    await refetchQueryProject();
  };

  // ==================== 建立專案 ====================
  const {
    mutateAsync: mutateCreate,
    isPending: isCreatingProject,
    error: createProjectError,
  } = useMutation({
    mutationFn: async (data: CreateProjectSchema) => {
      const response = await projectApi.createProject(data);
      return response.data;
    },
    onSuccess: async (newProject) => {
      if (newProject) {
        projectsStore.setProjects([...(projects.value || []), newProject]);
      }
      // 立即重新抓取專案列表，確保 useProjectCreationGuard 的 ownedProjectCount 使用最新資料
      await queryClient.refetchQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['overview-projects'] });
    },
  });

  const createProject = async (data: CreateProjectSchema): Promise<ProjectResponse | null> => {
    try {
      const result = await mutateCreate(data);
      return result || null;
    } catch (err: unknown) {
      console.error('建立專案失敗:', err);
      return null;
    }
  };

  // ==================== 更新專案 ====================
  const {
    mutateAsync: mutateUpdate,
    isPending: isUpdatingProject,
    error: updateProjectError,
  } = useMutation({
    mutationFn: async (data: Partial<CreateProjectSchema>) => {
      if (!id) throw new Error('更新專案需要 ID');
      const response = await projectApi.updateProject(id, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY, id], data);
    },
  });

  const updateProject = async (
    data: Partial<CreateProjectSchema>
  ): Promise<ProjectResponse | null> => {
    try {
      const result = await mutateUpdate(data);
      return result || null;
    } catch (err: unknown) {
      console.error('更新專案失敗:', err);
      return null;
    }
  };

  // ==================== 刪除專案 ====================
  const {
    mutateAsync: mutateDelete,
    isPending: isDeletingProject,
    error: deleteProjectError,
  } = useMutation({
    mutationFn: async (projectId: string) => {
      await projectApi.deleteProject(projectId);
    },
    onSuccess: (_data, deletedId) => {
      // 刪除成功：移除該專案的 detail 查詢，避免自動 refetch 已刪除的資源
      if (deletedId) {
        queryClient.removeQueries({ queryKey: [QUERY_KEY, deletedId], exact: true });
        const updatedProjects = (projects.value || []).filter(
          (project) => project.id !== deletedId
        );
        projectsStore.setProjects(updatedProjects);
      }
      // 同步更新列表資料
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: ['overview-projects'] });
    },
  });

  const deleteProject = async (projectId: string): Promise<void> => {
    try {
      await mutateDelete(projectId);
    } catch (err: unknown) {
      console.error('刪除專案失敗:', err);
    }
  };

  // ==================== 切換專案分享狀態 ====================
  const {
    mutateAsync: mutateToggleShare,
    isPending: isTogglingShare,
    error: toggleProjectShareError,
  } = useMutation<ProjectResponse, Error, void>({
    mutationFn: async () => {
      if (!id) throw new Error('切換分享狀態需要專案 ID');
      // const response = await projectApi.toggleProjectShare(id);
      // if (!response.data) {
      //   throw new Error(response.message || '切換分享狀態失敗');
      // }
      // return response.data;
      throw new Error('切換分享狀態功能已廢棄');
    },
    onSuccess: (data) => {
      queryClient.setQueryData([QUERY_KEY, id], data);
      queryClient.invalidateQueries({ queryKey: ['overview-projects'] });
    },
    onError: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, id] });
    },
  });

  const toggleProjectShare = async (): Promise<ProjectResponse | null> => {
    try {
      const result = await mutateToggleShare();
      return result || null;
    } catch (err: unknown) {
      console.error('切換專案分享狀態失敗:', err);
      return null;
    }
  };

  return {
    // 獲取專案資料
    fetchedProject: fetchedProject as Ref<ProjectResponse | undefined>,
    isLoadingProject,
    projectError,
    refetchProject,
    // 建立專案
    createProject,
    isCreatingProject,
    createProjectError,
    // 更新專案
    updateProject,
    isUpdatingProject,
    updateProjectError,
    // 刪除專案
    deleteProject,
    isDeletingProject,
    deleteProjectError,
    toggleProjectShare,
    isTogglingShare,
    toggleProjectShareError,
  };
}

export function useProjectMutations() {
  const queryClient = useQueryClient();

  const {
    mutateAsync: mutateUpdate,
    isPending: isUpdatingProject,
    error: updateProjectError,
  } = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateProjectSchema> }) => {
      const response = await projectApi.updateProject(id, data);
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(['project', variables.id], data);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  const updateProjectById = (id: string, data: Partial<CreateProjectSchema>) =>
    mutateUpdate({ id, data });

  return { updateProjectById, isUpdatingProject, updateProjectError };
}
