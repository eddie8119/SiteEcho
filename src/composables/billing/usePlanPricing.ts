import { computed } from 'vue';

import { useAppleIAP } from '@/composables/billing/useAppleIAP';
import { useBillingProvider } from '@/composables/billing/useBillingProvider';
import { usePricingPlans } from '@/composables/billing/usePricingPlans';

const isPricingMenu = () => {
  if (typeof window === 'undefined') return false;
  return window.location.pathname === '/pricing-menu';
};

export const usePlanPricing = () => {
  const { provider } = useBillingProvider();
  const {
    purchasePlan,
    isAppleIAPAvailable,
    isLoadingProducts,
    storeKitProducts,
    iapError,
    loadStoreKitProducts,
  } = useAppleIAP();

  const isLandingPage = isPricingMenu();

  const pricingPlatform = computed(() =>
    isLandingPage ? 'web' : isAppleIAPAvailable.value ? 'app_iap' : 'web'
  );

  const { plans: pricingPlans } = usePricingPlans(undefined, pricingPlatform, storeKitProducts);

  const isStoreKitReady = computed(() => {
    if (!isAppleIAPAvailable.value) return true;
    const monthlyProductId = 'com.SiteNear.pro.monthly';
    const yearlyProductId = 'com.SiteNear.pro.yearly';
    return (
      storeKitProducts.value[monthlyProductId] !== undefined &&
      storeKitProducts.value[yearlyProductId] !== undefined
    );
  });

  return {
    provider,
    isLandingPage,
    isAppleIAPAvailable,
    iapError,
    isLoadingProducts,
    loadStoreKitProducts,
    purchasePlan,
    storeKitProducts,
    pricingPlans,
    isStoreKitReady,
  };
};

export type UsePlanPricingReturn = ReturnType<typeof usePlanPricing>;
