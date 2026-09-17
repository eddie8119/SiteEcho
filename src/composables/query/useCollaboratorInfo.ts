// 專注於目前登入者的協作者狀態（是否為協作者、參與專案 ID 等）

import { useQuery } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';

import { collaboratorApi } from '@/api/collaborator';
import { useAuthStore } from '@/stores/useAuthStore';
import { isAccessTokenValid } from '@/utils/auth';

interface CollaboratorInfo {
  isCollaborator: boolean;
  collaboratingProjectIds: string[];
}

interface UseCollaboratorInfoReturn {
  isCollaborator: Ref<boolean>;
  collaboratingProjectIds: Ref<string[]>;
  isLoadingCollaboratorInfo: Ref<boolean>;
  collaboratorInfoError: Ref<Error | null>;
  refetchCollaboratorInfo: () => Promise<void>;
}

const COLLABORATOR_QUERY_KEY = 'collaborator-info';

export const useCollaboratorInfo = (): UseCollaboratorInfoReturn => {
  const authStore = useAuthStore();

  const isAuthAndTokenValid = computed(() => authStore.isAuthenticated && isAccessTokenValid());

  const {
    data: collaboratorInfoResponse,
    isLoading: isLoadingCollaboratorInfo,
    error: collaboratorInfoError,
    refetch: refetchQueryCollaboratorInfo,
  } = useQuery({
    queryKey: [COLLABORATOR_QUERY_KEY],
    queryFn: async (): Promise<CollaboratorInfo> => {
      const response = await collaboratorApi.getCollaboratorInfo();

      if (!response.data) {
        throw new Error('Missing collaborator info from API response');
      }

      return response.data;
    },
    enabled: isAuthAndTokenValid,
    staleTime: 1000 * 60 * 5,
  });

  const isCollaborator = computed(() => collaboratorInfoResponse.value?.isCollaborator ?? false);
  const collaboratingProjectIds = computed(
    () => collaboratorInfoResponse.value?.collaboratingProjectIds ?? []
  );

  const refetchCollaboratorInfo = async (): Promise<void> => {
    await refetchQueryCollaboratorInfo();
  };

  return {
    isCollaborator,
    collaboratingProjectIds,
    isLoadingCollaboratorInfo,
    collaboratorInfoError,
    refetchCollaboratorInfo,
  };
};
