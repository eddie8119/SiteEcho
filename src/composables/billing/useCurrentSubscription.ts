import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { UserSubscription } from '@/types/billing';

import { useBilling, useUserSubscription } from '@/composables/query/useBilling';
import { formatPlanDisplayName } from '@/utils/planDisplay';

const isPricingMenu = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/pricing-menu';
};

export const useCurrentSubscription = () => {
  const { t } = useI18n();
  const isLandingPage = isPricingMenu();

  useBilling({
    requireAuth: false,
    enabled: !isLandingPage,
  });

  const { subscription, refetchSubscription } = useUserSubscription({ enabled: !isLandingPage });

  const renewalDate = computed(() => {
    if (!subscription.value?.currentPeriodEnd) return undefined;
    return new Date(subscription.value.currentPeriodEnd);
  });

  const normalizePlanId = (value?: string | null) =>
    value?.toString().trim().toLowerCase().replace(/\s+/g, '-');

  const activeSubscriptionStatuses: Array<UserSubscription['status']> = ['active', 'pastDue'];

  const isSubscriptionActive = (sub?: UserSubscription | null) => {
    if (!sub) return false;
    return activeSubscriptionStatuses.includes(sub.status);
  };

  const isCurrentPlan = (planId: string): boolean => {
    const sub = subscription.value;
    if (!sub || !isSubscriptionActive(sub)) return false;

    const normalizedSubscriptionPlan = normalizePlanId(sub.plan);
    const normalizedPlanId = normalizePlanId(planId);

    if (!normalizedSubscriptionPlan || !normalizedPlanId) {
      return false;
    }

    return (
      normalizedSubscriptionPlan === normalizedPlanId ||
      normalizedSubscriptionPlan.includes(`${normalizedPlanId}-`) ||
      normalizedSubscriptionPlan.includes(`-${normalizedPlanId}`) ||
      normalizedSubscriptionPlan.includes(normalizedPlanId)
    );
  };

  const currentPlanMessage = computed<string | null>(() => {
    const sub = subscription.value;
    if (sub && isSubscriptionActive(sub) && sub.plan) {
      const planDisplayName = formatPlanDisplayName(sub.plan, t);
      return t('billing.subscription.currentPlanLabel', { plan: planDisplayName });
    }
    return null;
  });

  return {
    subscription,
    refetchSubscription,
    renewalDate,
    isCurrentPlan,
    currentPlanMessage,
  };
};

export type UseCurrentSubscriptionReturn = ReturnType<typeof useCurrentSubscription>;
