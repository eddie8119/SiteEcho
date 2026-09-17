import { onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import type { UseCurrentSubscriptionReturn } from './useCurrentSubscription';
import type { UsePlanFeedbackReturn } from './usePlanFeedback';
import type { UsePlanPricingReturn } from './usePlanPricing';
import type { UsePlanUpgradeReturn } from './usePlanUpgrade';

import { usePaddle } from '@/composables/billing/usePaddle';
import { isAccessTokenValid } from '@/utils/auth';

export interface SelectPlanPayload {
  planId: string;
  billingInterval: 'month' | 'year';
  productId?: string;
}

type CheckoutSessionError = {
  response?: {
    status?: number;
    data?: { code?: string };
  };
};

export const usePlanCheckout = ({
  feedback,
  pricing,
  currentSubscription,
  upgrade,
}: {
  feedback: UsePlanFeedbackReturn;
  pricing: UsePlanPricingReturn;
  currentSubscription: UseCurrentSubscriptionReturn;
  upgrade: UsePlanUpgradeReturn;
}) => {
  const { t } = useI18n();
  const route = useRoute();
  const router = useRouter();
  const { openPaddleCheckout } = usePaddle();

  const { isCurrentPlan, subscription } = currentSubscription;
  const { openUpgradeDialog } = upgrade;
  const { isAppleIAPAvailable, storeKitProducts, purchasePlan, pricingPlans } = pricing;

  const handleSelectPlan = async ({ planId, billingInterval, productId }: SelectPlanPayload) => {
    try {
      feedback.clearWarning();
      if (isCurrentPlan(planId)) {
        feedback.setWarning(t('billing.alreadySubscribedSamePlan'));
        return;
      }

      if (planId === 'free') {
        return;
      }

      if (isAppleIAPAvailable.value) {
        if (!storeKitProducts.value || Object.keys(storeKitProducts.value).length === 0) {
          feedback.setWarning(t('billing.subscription.productsNotLoaded'));
          return;
        }
        feedback.setLoading(planId);
        const res = await purchasePlan(productId);
        if (res.success) {
          if (res.transactionId) {
            feedback.showToast(t('billing.subscription.purchaseInitiated'), 'info');
          }
        } else if (res.error) {
          if (res.cancelled) {
            feedback.clearWarning();
          } else if (res.pending) {
            feedback.setWarning(t('billing.subscription.purchasePending'));
          } else {
            feedback.setWarning(res.error);
          }
        }
        return;
      }

      if (subscription.value && subscription.value.status === 'active') {
        openUpgradeDialog(planId);
        return;
      }

      feedback.setLoading(planId);
      const targetPlan = pricingPlans.value.find((p) => p.id === planId);
      const priceId =
        billingInterval === 'year'
          ? targetPlan?.paddlePriceIdYearly
          : targetPlan?.paddlePriceIdMonthly;

      if (!priceId) {
        console.error('[Paddle] No price ID configured for plan', planId, billingInterval);
        feedback.setWarning(t('billing.subscription.priceUnavailable'));
        feedback.setLoading(null);
        return;
      }

      await openPaddleCheckout({ priceId, planId });
    } catch (error) {
      const err = error as CheckoutSessionError;
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 409 || code === 'ALREADY_SUBSCRIBED_SAME_PLAN') {
        feedback.setWarning(t('billing.alreadySubscribedSamePlan'));
        return;
      }
      console.error('Failed to create checkout session:', error);
    } finally {
      feedback.setLoading(null);
    }
  };

  const handleContactSales = () => {
    window.location.href =
      'mailto:support@interior-helper.app?subject=Contact%20Sales%20-%20Lite%20Seat';
  };

  onMounted(async () => {
    const { autoCheckout, plan, interval } = route.query;

    if (autoCheckout === 'true' && typeof plan === 'string' && isAccessTokenValid()) {
      const billingInterval = interval === 'year' ? 'year' : 'month';
      const targetPlan = pricingPlans.value.find((p) => p.id === plan);
      const productId =
        billingInterval === 'year' ? targetPlan?.productIdYearly : targetPlan?.productIdMonthly;

      const newQuery = { ...route.query };
      delete newQuery.autoCheckout;
      delete newQuery.plan;
      delete newQuery.interval;
      await router.replace({ query: newQuery });

      feedback.showToast(t('billing.subscription.autoCheckoutGuidance'), 'info');

      await handleSelectPlan({
        planId: plan,
        billingInterval,
        productId,
      });
    }
  });

  return {
    handleSelectPlan,
    handleContactSales,
  };
};
