import { useQuery } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';

import { subscriptionApi } from '@/api/subscription';
import { useAuthStore } from '@/stores/useAuthStore';
import { SUBSCRIPTION_TYPES, type SubscriptionType } from '@/types/billing';

const SUBSCRIPTION_INFO_QUERY_KEY = 'subscriptionInfo' as const;
const PROJECT_SUBSCRIPTION_INFO_QUERY_KEY = 'projectSubscriptionInfo' as const;

export const useSubscription = (projectId?: Ref<string | undefined>) => {
  const authStore = useAuthStore();

  const {
    data: subscriptionResponse,
    isLoading,
    refetch: refetchSubscription,
  } = useQuery({
    queryKey: [SUBSCRIPTION_INFO_QUERY_KEY],
    queryFn: async () => {
      const response = await subscriptionApi.getSubscriptionInfo();
      return response.data ?? null;
    },
    enabled: authStore.isAuthenticated,
    staleTime: 5 * 60 * 1000,
  });

  // Query project owner's subscription (for collaborators)
  const { data: projectSubscriptionResponse } = useQuery({
    queryKey: [PROJECT_SUBSCRIPTION_INFO_QUERY_KEY, projectId?.value],
    queryFn: async () => {
      if (!projectId?.value) return null;
      const response = await subscriptionApi.getProjectSubscriptionInfo(projectId.value);
      return response.data ?? null;
    },
    enabled: computed(() => !!projectId?.value),
    staleTime: 5 * 60 * 1000,
  });

  const subscriptionData = computed(() => {
    // If projectId is provided, use project owner's subscription (for collaborators)
    if (projectId?.value && projectSubscriptionResponse.value) {
      return projectSubscriptionResponse.value;
    }
    // Otherwise use user's own subscription
    return subscriptionResponse.value;
  });

  const subscription = computed(() => subscriptionData.value?.subscription ?? null);
  const subscriptionType = computed<SubscriptionType>(
    () => subscriptionData.value?.subscriptionType ?? SUBSCRIPTION_TYPES.FREEMIUM
  );
  const limits = computed(
    () =>
      subscriptionData.value?.limits ?? {
        maxMembers: Infinity,
        storageLimitBytes: 0,
        usedStorageBytes: 0,
        photoCount: 0,
        reportExportMonthlyLimit: 5,
        followUpMonthlyLimit: 15,
        usedReportExports: 0,
        usedFollowUps: 0,
        remainingReportExports: 5,
        remainingFollowUps: 15,
      }
  );

  const isFreemium = computed(() => subscriptionType.value === SUBSCRIPTION_TYPES.FREEMIUM);
  const isPaid = computed(() => subscriptionType.value === SUBSCRIPTION_TYPES.PAID);
  const isSubscribed = computed(() => isPaid.value);

  return {
    subscription,
    subscriptionType,
    limits,
    isFreemium,
    isPaid,
    isSubscribed,
    isLoading,
    refetchSubscription,
  };
};
