import { computed, onMounted, ref } from 'vue';

import type { GooglePlayProductDetails } from '@/plugins/googlePlayBilling';

import { GOOGLE_PLAY_PRODUCT } from '@/config/planConfig';
import { googlePlayBillingService } from '@/services/googlePlayBillingService';
import { getCurrentUserId } from '@/utils/user';

const GOOGLE_PLAY_BILLING_ENABLED = import.meta.env.VITE_GOOGLE_PLAY_BILLING_ENABLED === 'true';

async function hashUserId(userId: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
      .slice(0, 64);
  }

  // Fallback: simple deterministic string for non-secure contexts
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash = hash & hash;
  }
  return `SiteNear-${Math.abs(hash).toString(16).padStart(16, '0')}`.slice(0, 64);
}

export const useGooglePlayBilling = () => {
  const isAvailable = ref(false);
  const isLoadingProducts = ref(false);
  const isPurchasing = ref(false);
  const isSyncing = ref(false);
  const products = ref<GooglePlayProductDetails[]>([]);
  const billingError = ref<string | null>(null);

  const monthlyOffer = computed(() =>
    findOfferByBasePlan(GOOGLE_PLAY_PRODUCT.MONTHLY_BASE_PLAN_ID)
  );
  const yearlyOffer = computed(() => findOfferByBasePlan(GOOGLE_PLAY_PRODUCT.YEARLY_BASE_PLAN_ID));

  function findOfferByBasePlan(basePlanId: string) {
    for (const product of products.value) {
      for (const offer of product.offers) {
        if (offer.basePlanId === basePlanId) {
          return offer;
        }
      }
    }
    return null;
  }

  const getObfuscatedAccountId = async (): Promise<string | undefined> => {
    const userId = getCurrentUserId();
    if (!userId) return undefined;
    return hashUserId(userId);
  };

  const loadProducts = async () => {
    if (!GOOGLE_PLAY_BILLING_ENABLED) {
      products.value = [];
      return;
    }

    isLoadingProducts.value = true;
    billingError.value = null;

    try {
      const res = await googlePlayBillingService.loadProducts();
      products.value = res.products ?? [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load Google Play products';
      billingError.value = msg;
      products.value = [];
    } finally {
      isLoadingProducts.value = false;
    }
  };

  const purchase = async (basePlanId: string) => {
    isPurchasing.value = true;
    billingError.value = null;

    try {
      const obfuscatedAccountId = await getObfuscatedAccountId();
      const res = await googlePlayBillingService.purchase(basePlanId, obfuscatedAccountId ?? '');

      if (!res.billingFlowStarted) {
        billingError.value = res.debugMessage;
        return { success: false, error: res.debugMessage };
      }

      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Play purchase failed';
      billingError.value = msg;
      return { success: false, error: msg };
    } finally {
      isPurchasing.value = false;
    }
  };

  const purchaseMonthly = () => purchase(GOOGLE_PLAY_PRODUCT.MONTHLY_BASE_PLAN_ID);
  const purchaseYearly = () => purchase(GOOGLE_PLAY_PRODUCT.YEARLY_BASE_PLAN_ID);

  const syncPurchases = async () => {
    isSyncing.value = true;
    billingError.value = null;

    try {
      const res = await googlePlayBillingService.queryPurchases();
      return res.purchases ?? [];
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sync Google Play purchases';
      billingError.value = msg;
      return [];
    } finally {
      isSyncing.value = false;
    }
  };

  const openSubscriptionManagement = async () => {
    return googlePlayBillingService.openSubscriptionManagement();
  };

  onMounted(async () => {
    if (!GOOGLE_PLAY_BILLING_ENABLED) {
      isAvailable.value = false;
      return;
    }

    const userId = getCurrentUserId();
    if (!userId) {
      isAvailable.value = false;
      return;
    }

    try {
      await googlePlayBillingService.initialize(userId);
      isAvailable.value = true;
      await loadProducts();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Google Play Billing initialization failed';
      billingError.value = msg;
      isAvailable.value = false;
    }
  });

  return {
    isAvailable,
    isLoadingProducts,
    isPurchasing,
    isSyncing,
    products,
    monthlyOffer,
    yearlyOffer,
    billingError,
    loadProducts,
    purchaseMonthly,
    purchaseYearly,
    syncPurchases,
    openSubscriptionManagement,
  };
};
