import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type Ref } from 'vue';

import type { BillingStatus } from '@/api/billing';
import type { UpgradeSubscriptionMode, UserSubscription } from '@/types/billing';

import { billingApi } from '@/api/billing';
import { useAuthStore } from '@/stores/useAuthStore';
import { isAccessTokenValid } from '@/utils/auth';

interface UseBillingReturn {
  billingStatus: Ref<BillingStatus | undefined>;
  isBillingEnabled: Ref<boolean>;
  isLoadingBillingStatus: Ref<boolean>;
  billingStatusError: Ref<Error | null>;
  refetchBillingStatus: () => Promise<void>;
}

interface UseBillingOptions {
  enabled?: boolean;
  requireAuth?: boolean;
}

type CheckoutSessionResponse = Awaited<ReturnType<typeof billingApi.createCheckoutSession>>;
type CustomerPortalSessionResponse = Awaited<
  ReturnType<typeof billingApi.createCustomerPortalSession>
>;

const QUERY_KEY = 'billing-status';
const USER_SUBSCRIPTION_QUERY_KEY = 'user-subscription';

type ServerUserSubscription = Omit<UserSubscription, 'status'> & {
  status: 'active' | 'inactive' | 'cancelled' | 'past_due';
};

export const useBilling = (options?: UseBillingOptions): UseBillingReturn => {
  const authStore = useAuthStore();

  const isAuthAndTokenValid = computed(() => authStore.isAuthenticated && isAccessTokenValid());

  const queryEnabled = computed(() => {
    if (options?.enabled === false) {
      return false;
    }

    if (options?.requireAuth === false) {
      return true;
    }

    return isAuthAndTokenValid.value;
  });

  const {
    data: billingStatusResponse,
    isLoading: isLoadingBillingStatus,
    error: billingStatusError,
    refetch: refetchQueryBillingStatus,
  } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const response = await billingApi.getBillingStatus();
      return response.data;
    },
    enabled: queryEnabled,
    staleTime: 1000 * 60 * 5,
  });

  const billingStatus = computed(() => billingStatusResponse.value);
  const isBillingEnabled = computed(() => billingStatus.value?.enabled ?? false);

  const refetchBillingStatus = async (): Promise<void> => {
    await refetchQueryBillingStatus();
  };

  return {
    billingStatus,
    isBillingEnabled,
    isLoadingBillingStatus,
    billingStatusError,
    refetchBillingStatus,
  };
};

interface UseUpgradePlanReturn {
  upgradePlan: (planId: string, mode: UpgradeSubscriptionMode) => Promise<CheckoutSessionResponse>;
  isUpgrading: Ref<boolean>;
  upgradeError: Ref<Error | null>;
}

export const useUpgradePlan = (): UseUpgradePlanReturn => {
  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: ({ planId, mode }: { planId: string; mode: UpgradeSubscriptionMode }) =>
      billingApi.createCheckoutSession(planId, { upgradeMode: mode }),
  });

  const upgradePlan = async (
    planId: string,
    mode: UpgradeSubscriptionMode
  ): Promise<CheckoutSessionResponse> => {
    return mutateAsync({ planId, mode });
  };

  return {
    upgradePlan,
    isUpgrading: isPending,
    upgradeError: error as Ref<Error | null>,
  };
};

interface UseUserSubscriptionReturn {
  subscription: Ref<UserSubscription | null | undefined>;
  isLoadingSubscription: Ref<boolean>;
  subscriptionError: Ref<Error | null>;
  refetchSubscription: () => Promise<void>;
  cancelUserSubscription: () => Promise<void>;
  isCancellingSubscription: Ref<boolean>;
  cancelSubscriptionError: Ref<Error | null>;
  resumeUserSubscription: () => Promise<void>;
  isResumingSubscription: Ref<boolean>;
  resumeSubscriptionError: Ref<Error | null>;
  createSubscriptionCheckoutSession: (planId: string) => Promise<CheckoutSessionResponse>;
  isCreatingCheckoutSession: Ref<boolean>;
  createCheckoutSessionError: Ref<Error | null>;
  createSubscriptionCustomerPortalSession: () => Promise<CustomerPortalSessionResponse>;
  isCreatingCustomerPortalSession: Ref<boolean>;
  createCustomerPortalSessionError: Ref<Error | null>;
}

export const useUserSubscription = (options?: UseBillingOptions): UseUserSubscriptionReturn => {
  const authStore = useAuthStore();
  const queryClient = useQueryClient();

  const isAuthAndTokenValid = computed(() => authStore.isAuthenticated && isAccessTokenValid());

  const queryEnabled = computed(() => {
    if (options?.enabled === false) {
      return false;
    }

    if (options?.requireAuth === false) {
      return true;
    }

    return isAuthAndTokenValid.value;
  });

  const {
    data: subscriptionResponse,
    isLoading: isLoadingSubscription,
    error: subscriptionError,
    refetch: refetchQuerySubscription,
  } = useQuery({
    queryKey: [USER_SUBSCRIPTION_QUERY_KEY],
    queryFn: async () => {
      const response = await billingApi.getUserSubscription();
      const raw = (response.data as ServerUserSubscription | null) ?? null;
      if (!raw) return null;
      const status: UserSubscription['status'] = raw.status === 'past_due' ? 'pastDue' : raw.status;
      return { ...raw, status } as UserSubscription;
    },
    enabled: queryEnabled,
    // Keep reasonably fresh; adjust as needed
    staleTime: 1000 * 30,
  });

  const subscription = computed(() => subscriptionResponse.value ?? null);

  const refetchSubscription = async (): Promise<void> => {
    await refetchQuerySubscription();
  };

  const {
    mutateAsync: mutateCancelSubscription,
    isPending: isCancellingSubscription,
    error: cancelSubscriptionError,
  } = useMutation({
    mutationFn: async () => {
      const response = await billingApi.cancelSubscription();
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USER_SUBSCRIPTION_QUERY_KEY] });
    },
  });

  const cancelUserSubscription = async (): Promise<void> => {
    await mutateCancelSubscription();
  };

  const {
    mutateAsync: mutateResumeSubscription,
    isPending: isResumingSubscription,
    error: resumeSubscriptionError,
  } = useMutation({
    mutationFn: async () => {
      const response = await billingApi.resumeSubscription();
      return response.data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [USER_SUBSCRIPTION_QUERY_KEY] });
    },
  });

  const resumeUserSubscription = async (): Promise<void> => {
    await mutateResumeSubscription();
  };

  const {
    mutateAsync: mutateCreateCheckoutSession,
    isPending: isCreatingCheckoutSession,
    error: createCheckoutSessionError,
  } = useMutation({
    mutationFn: (planId: string) => billingApi.createCheckoutSession(planId),
  });

  const createSubscriptionCheckoutSession = async (planId: string) => {
    return mutateCreateCheckoutSession(planId);
  };

  const {
    mutateAsync: mutateCreateCustomerPortalSession,
    isPending: isCreatingCustomerPortalSession,
    error: createCustomerPortalSessionError,
  } = useMutation({
    mutationFn: () => billingApi.createCustomerPortalSession(),
  });

  const createSubscriptionCustomerPortalSession = async () => {
    return mutateCreateCustomerPortalSession();
  };

  return {
    subscription,
    isLoadingSubscription,
    subscriptionError,
    refetchSubscription,
    cancelUserSubscription,
    isCancellingSubscription,
    cancelSubscriptionError,
    resumeUserSubscription,
    isResumingSubscription,
    resumeSubscriptionError,
    createSubscriptionCheckoutSession,
    isCreatingCheckoutSession,
    createCheckoutSessionError,
    createSubscriptionCustomerPortalSession,
    isCreatingCustomerPortalSession,
    createCustomerPortalSessionError,
  };
};
