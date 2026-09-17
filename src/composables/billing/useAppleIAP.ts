import { Capacitor } from '@capacitor/core';
import { computed, onMounted, ref } from 'vue';

import type { StoreKitProductDiagnostics, StoreKitProductMap } from '@/types/billing';

import { APPLE_IAP_PRODUCT_IDS } from '@/config/planConfig';
import { AppleStoreKit } from '@/plugins/appleStoreKit';
import { appleIapService } from '@/services/appleIapService';

const APPLE_IAP_FLOW_BLOCKED_MESSAGE =
  'Apple IAP is temporarily disabled while the StoreKit 2 purchase flow is being implemented';
const isAppleIAPFlowEnabled = true;

export const useAppleIAP = () => {
  const isPurchasing = ref(false);
  const isRestoring = ref(false);
  const isLoadingProducts = ref(false);
  const iapError = ref<string | null>(null);
  const storeKitProducts = ref<StoreKitProductMap>({});
  const storeKitDiagnostics = ref<StoreKitProductDiagnostics | null>(null);

  const isNative = Capacitor.isNativePlatform();
  const isIOS = Capacitor.getPlatform() === 'ios';
  const isAppleIAPAvailable = computed(() => isNative && isIOS);

  // Stage 2: Initialize singleton service and load products on mount
  onMounted(async () => {
    await appleIapService.initialize();
    await loadStoreKitProducts();
  });

  const loadStoreKitProducts = async () => {
    if (!isAppleIAPAvailable.value) {
      storeKitProducts.value = {};
      storeKitDiagnostics.value = null;
      return;
    }

    isLoadingProducts.value = true;
    iapError.value = null;

    try {
      const res = await AppleStoreKit.getProducts();
      console.info('[AppleStoreKit] products response', res);
      const products = res.products ?? [];
      storeKitDiagnostics.value = res.diagnostics ?? null;
      storeKitProducts.value = products.reduce<StoreKitProductMap>((acc, product) => {
        acc[product.productId] = product;
        return acc;
      }, {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load StoreKit products';
      console.error('[AppleStoreKit] getProducts error', err);
      iapError.value = msg;
      storeKitDiagnostics.value = null;
      storeKitProducts.value = {};
    } finally {
      isLoadingProducts.value = false;
    }
  };

  /**
   * Request Purchase for a StoreKit Product ID
   */
  const purchasePlan = async (productId: string = APPLE_IAP_PRODUCT_IDS.MONTHLY) => {
    isPurchasing.value = true;
    iapError.value = null;

    try {
      if (!isAppleIAPAvailable.value) {
        throw new Error('Apple IAP is only available on iOS native app');
      }

      if (!isAppleIAPFlowEnabled) {
        throw new Error(APPLE_IAP_FLOW_BLOCKED_MESSAGE);
      }

      const res = await AppleStoreKit.purchase({ productId });

      if (res.result === 'success') {
        const processResult = await appleIapService.processTransaction(res);

        if (processResult.success) {
          return {
            success: true,
            transactionId: res.transactionId,
            originalTransactionId: res.originalTransactionId,
            productId: res.productId,
          };
        }

        iapError.value = processResult.error ?? 'Backend verification failed';
        return { success: false, error: iapError.value };
      }

      if (res.result === 'pending') {
        return { success: false, error: 'Purchase is pending approval', pending: true };
      }

      if (res.result === 'userCancelled') {
        return { success: false, error: 'Purchase was cancelled', cancelled: true };
      }

      iapError.value = res.error ?? 'Purchase failed';
      return { success: false, error: iapError.value };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'IAP purchase failed';
      iapError.value = msg;
      return { success: false, error: msg };
    } finally {
      isPurchasing.value = false;
    }
  };

  /**
   * Restore previous Apple Purchases
   */
  const restorePurchases = async (originalTransactionId?: string) => {
    isRestoring.value = true;
    iapError.value = null;

    try {
      if (!isAppleIAPAvailable.value) {
        throw new Error('Apple IAP is only available on iOS native app');
      }

      void originalTransactionId;

      if (!isAppleIAPFlowEnabled) {
        throw new Error(APPLE_IAP_FLOW_BLOCKED_MESSAGE);
      }

      const res = await AppleStoreKit.restorePurchases();

      if (res.result !== 'success') {
        return { success: false, error: 'Restore purchases failed' };
      }

      const verifiedTransactions: string[] = [];

      for (const transaction of res.restoredTransactions) {
        const processResult = await appleIapService.processTransaction(transaction);
        if (processResult.success) {
          verifiedTransactions.push(transaction.transactionId);
        }
      }

      return {
        success: true,
        message:
          verifiedTransactions.length > 0
            ? `Successfully restored ${verifiedTransactions.length} purchase(s)`
            : 'No valid purchases to restore',
        restoredTransactions: verifiedTransactions,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Restore purchases failed';
      iapError.value = msg;
      return { success: false, error: msg };
    } finally {
      isRestoring.value = false;
    }
  };

  return {
    isNative,
    isIOS,
    isAppleIAPAvailable,
    isPurchasing,
    isRestoring,
    isLoadingProducts,
    iapError,
    storeKitProducts,
    storeKitDiagnostics,
    loadStoreKitProducts,
    purchasePlan,
    restorePurchases,
  };
};
