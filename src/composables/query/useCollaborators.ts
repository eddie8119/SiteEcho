// 處理專案或全域協作者名單與各種新增/更新/刪除操作
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { useI18n } from 'vue-i18n';

import type { CollaboratorRole } from '@/types/collaborator';
import type { ProjectCollaboratorResponse } from '@/types/response';

import { collaboratorApi } from '@/api/collaborator';
import { createGlobalInvitation, createProjectInvitation } from '@/api/invitation';

// All project collaborators across all projects
export const useAllProjectCollaborators = () => {
  // Fetch all project collaborators
  const {
    data: collaborators,
    isLoading: isLoadingAllCollaborators,
    error: errorAllCollaborators,
    refetch: refetchAllCollaborators,
  } = useQuery({
    queryKey: ['allProjectCollaborators'],
    queryFn: async () => {
      const response = await collaboratorApi.getAllProjectCollaborators();
      return response.data;
    },
  });

  return {
    collaborators,
    isLoadingAllCollaborators,
    errorAllCollaborators,
    refetch: refetchAllCollaborators,
  };
};

// Project-specific collaborators
export const useProjectCollaborators = (projectId: string) => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Fetch project collaborators
  const {
    data: collaborators,
    isLoading: isLoadingCollaborators,
    error: errorCollaborators,
    refetch: refetchCollaborators,
  } = useQuery({
    queryKey: ['projectCollaborators', projectId],
    queryFn: async () => {
      const response = await collaboratorApi.getProjectCollaborators(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });

  // Add collaborator mutation (使用邀請系統)
  const addCollaboratorMutation = useMutation({
    mutationFn: () => createProjectInvitation(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectCollaborators', projectId] });
      ElMessage.success(t('message.invitation.sent'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.invitation.send_failed');
      ElMessage.error(message);
    },
  });

  // Update collaborator mutation
  const updateCollaboratorMutation = useMutation({
    mutationFn: (data: { collaboratorId: string; role: CollaboratorRole }) =>
      collaboratorApi.updateProjectCollaborator(projectId, data.collaboratorId, {
        role: data.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projectCollaborators', projectId] });
      ElMessage.success(t('message.collaborator_updated'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.update_collaborator_failed');
      ElMessage.error(message);
    },
  });

  // Remove collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: (collaboratorId: string) =>
      collaboratorApi.removeProjectCollaborator(projectId, collaboratorId),
    onSuccess: (_response, collaboratorId) => {
      queryClient.setQueryData<ProjectCollaboratorResponse[]>(
        ['projectCollaborators', projectId],
        (currentCollaborators) =>
          currentCollaborators?.filter((collaborator) => collaborator.id !== collaboratorId) ?? []
      );
      void queryClient.invalidateQueries({ queryKey: ['projectCollaborators', projectId] });
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
      ElMessage.success(t('message.collaborator_removed'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.remove_collaborator_failed');
      ElMessage.error(message);
    },
  });

  // Handlers with names expected by components
  const handleAddCollaborator = () => {
    if (!projectId) return;
    addCollaboratorMutation.mutate();
  };

  const handleUpdateRole = (payload: { collaboratorId: string; role: CollaboratorRole }) => {
    if (!projectId) return;
    updateCollaboratorMutation.mutate(payload);
  };

  const handleRemoveCollaborator = (collaboratorId: string) => {
    if (!projectId) return Promise.resolve();
    return removeCollaboratorMutation.mutateAsync(collaboratorId);
  };

  return {
    collaborators,
    isLoadingCollaborators,
    errorCollaborators,
    refetch: refetchCollaborators,
    addCollaborator: addCollaboratorMutation.mutate,
    updateCollaborator: updateCollaboratorMutation.mutate,
    removeCollaborator: removeCollaboratorMutation.mutate,
    isAdding: addCollaboratorMutation.isPending,
    isUpdating: updateCollaboratorMutation.isPending,
    isRemoving: removeCollaboratorMutation.isPending,
    handleAddCollaborator,
    handleUpdateRole,
    handleRemoveCollaborator,
  };
};

// Global collaborators
export const useGlobalCollaborators = () => {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Fetch global collaborators
  const {
    data: collaborators,
    isLoading: isLoadingGlobalCollaborators,
    error: errorGlobalCollaborators,
    refetch: refetchGlobalCollaborators,
  } = useQuery({
    queryKey: ['globalCollaborators'],
    queryFn: async () => {
      const response = await collaboratorApi.getGlobalCollaborators();
      return response.data;
    },
  });

  // Add global collaborator mutation (使用邀請系統)
  const addCollaboratorMutation = useMutation({
    mutationFn: (data: { collaboratorEmail: string; role?: CollaboratorRole }) =>
      createGlobalInvitation(data.collaboratorEmail, data.role || 'viewer'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalCollaborators'] });
      ElMessage.success(t('message.invitation.sent'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.invitation.send_failed');
      ElMessage.error(message);
    },
  });

  // Update global collaborator mutation
  const updateCollaboratorMutation = useMutation({
    mutationFn: (data: { collaboratorId: string; role: CollaboratorRole }) =>
      collaboratorApi.updateGlobalCollaborator(data.collaboratorId, { role: data.role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalCollaborators'] });
      ElMessage.success(t('message.global_collaborator_updated'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.update_collaborator_failed');
      ElMessage.error(message);
    },
  });

  // Remove global collaborator mutation
  const removeCollaboratorMutation = useMutation({
    mutationFn: (collaboratorId: string) =>
      collaboratorApi.removeGlobalCollaborator(collaboratorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['globalCollaborators'] });
      ElMessage.success(t('message.global_collaborator_removed'));
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        t('message.remove_collaborator_failed');
      ElMessage.error(message);
    },
  });

  return {
    collaborators,
    isLoadingGlobalCollaborators,
    errorGlobalCollaborators,
    refetchGlobalCollaborators,
    addCollaborator: addCollaboratorMutation.mutate,
    updateCollaborator: updateCollaboratorMutation.mutate,
    removeCollaborator: removeCollaboratorMutation.mutate,
    isAdding: addCollaboratorMutation.isPending,
    isUpdating: updateCollaboratorMutation.isPending,
    isRemoving: removeCollaboratorMutation.isPending,
  };
};
