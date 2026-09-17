/**
 * 用於獲取。
 *
 * @returns {Object}
 */

import { useQuery } from '@tanstack/vue-query';
import { computed, type Ref, watch } from 'vue';
import { useRoute } from 'vue-router';

import type { ProjectResponse } from '@/types/response';

import { projectApi } from '@/api/project';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProjectsStore } from '@/stores/useProjectsStore';
import { isAccessTokenValid } from '@/utils/auth';

interface UseOverviewProjectsReturn {
  // 用於概覽頁面
  isLoadingOverviewProjects: Ref<boolean>;
  overviewError: Ref<Error | null>;
  fetchedOverviewProjects: Ref<ProjectResponse[] | undefined>;
  overviewProjectsUpdatedAt: Ref<number>;
  refetchOverviewProjects: () => Promise<void>;
}

interface UseProjectsReturn {
  // 用於專案頁面
  isLoadingProjects: Ref<boolean>;
  error: Ref<Error | null>;
  fetchedProjects: Ref<ProjectResponse[] | undefined>;
  refetchProjects: () => Promise<void>;
  projectsUpdatedAt: Ref<number>;
}

export const useOverviewProjects = (): UseOverviewProjectsReturn => {
  const {
    data: fetchedOverviewProjects,
    isLoading: isLoadingOverviewProjects,
    error: overviewError,
    dataUpdatedAt: overviewProjectsUpdatedAt,
    refetch: refetchOverviewProjects,
  } = useQuery({
    queryKey: ['overview-projects'],
    queryFn: async () => {
      const response = await projectApi.getOverviewProjects();
      return response.data;
    },
    staleTime: 1000 * 10 * 3,
  });

  return {
    isLoadingOverviewProjects,
    overviewError,
    fetchedOverviewProjects,
    overviewProjectsUpdatedAt,
    refetchOverviewProjects: async () => {
      await refetchOverviewProjects();
    },
  };
};

// 用於專案頁面
export const useProjects = (): UseProjectsReturn => {
  const projectsStore = useProjectsStore();
  const route = useRoute();
  const authStore = useAuthStore();

  // Only fetch projects when in /app or /desktop routes and user is authenticated with valid token
  const isAppRoute = computed(() => route.path.startsWith('/app'));
  const isDesktopRoute = computed(() => route.path.startsWith('/desktop'));
  const isAuthAndTokenValid = computed(() => authStore.isAuthenticated && isAccessTokenValid());
  const shouldFetchProjects = computed(
    () => (isAppRoute.value || isDesktopRoute.value) && isAuthAndTokenValid.value
  );

  const {
    data: fetchedProjects,
    isLoading: isLoadingProjects,
    refetch: refetchQueryProjects,
    error,
    dataUpdatedAt: projectsUpdatedAt,
  } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await projectApi.getProjects();
      return response.data;
    },
    enabled: shouldFetchProjects,
    staleTime: 1000 * 10 * 3,
  });

  // Watch for changes in fetchedProjects and update the store
  watch(
    fetchedProjects,
    (newProjects) => {
      if (newProjects) {
        projectsStore.setProjects(newProjects);
      }
    },
    { immediate: true }
  );

  const refetchProjects = async (): Promise<void> => {
    await refetchQueryProjects();
  };

  // 注意: 返回類型中的 Ref 需要從 vue 導入
  // 但由於這個 composable 只返回 useQuery 的原生狀態，不需要額外的 Ref 類型

  return {
    isLoadingProjects,
    error,
    fetchedProjects,
    refetchProjects,
    projectsUpdatedAt,
  };
};
