import type {
  GooglePlayBillingPurchaseUpdate,
  GooglePlayPurchase,
} from '@/plugins/googlePlayBilling';

import { billingApi } from '@/api/billing';
import { GooglePlayBilling } from '@/plugins/googlePlayBilling';

const GOOGLE_PLAY_BILLING_ENABLED = import.meta.env.VITE_GOOGLE_PLAY_BILLING_ENABLED === 'true';

let initialized = false;
const processingTokens = new Set<string>();
const completedTokens = new Set<string>();

const processPurchaseToken = async (purchase: GooglePlayPurchase, _userId: string) => {
  const { purchaseToken } = purchase;

  if (processingTokens.has(purchaseToken) || completedTokens.has(purchaseToken)) {
    return;
  }

  processingTokens.add(purchaseToken);

  try {
    const productId = purchase.productIds[0] ?? 'SiteNear_pro';
    const verifyResult = await billingApi.verifyGooglePurchase({
      purchaseToken,
      productId,
    });

    if (verifyResult.data?.success) {
      completedTokens.add(purchaseToken);
    }
  } catch (error) {
    console.error(
      '[GooglePlayBillingService] Verification failed for token:',
      purchaseToken,
      error
    );
  } finally {
    processingTokens.delete(purchaseToken);
  }
};

const handlePurchaseUpdate = async (event: GooglePlayBillingPurchaseUpdate, _userId: string) => {
  for (const purchase of event.purchases) {
    if (purchase.purchaseState !== 1) {
      // Not PURCHASED (0 = purchased in Google Play Billing v5+ / v6? Actually: PURCHASED=1)
      continue;
    }

    await processPurchaseToken(purchase, _userId);
  }
};

export const googlePlayBillingService = {
  async initialize(_userId: string) {
    if (initialized || !GOOGLE_PLAY_BILLING_ENABLED) {
      return;
    }

    try {
      await GooglePlayBilling.initialize();
      initialized = true;

      const listener = await GooglePlayBilling.addListener('purchaseUpdated', async (event) => {
        await handlePurchaseUpdate(event, _userId);
      });

      // Foreground sync
      const result = await GooglePlayBilling.queryPurchases();
      if (result.purchases.length > 0) {
        await handlePurchaseUpdate(
          {
            purchases: result.purchases,
            responseCode: 0,
            debugMessage: 'foreground-sync',
          },
          _userId
        );
      }

      return listener;
    } catch (error) {
      console.error('[GooglePlayBillingService] Initialize failed:', error);
      throw error;
    }
  },

  async loadProducts() {
    if (!initialized) {
      return { products: [] };
    }

    return GooglePlayBilling.getProducts();
  },

  async purchase(basePlanId: string, obfuscatedAccountId: string) {
    if (!initialized) {
      throw new Error('Google Play Billing is not initialized');
    }

    return GooglePlayBilling.purchase({ basePlanId, obfuscatedAccountId });
  },

  async queryPurchases() {
    if (!initialized) {
      return { purchases: [] };
    }

    return GooglePlayBilling.queryPurchases();
  },

  async openSubscriptionManagement() {
    return GooglePlayBilling.openSubscriptionManagement();
  },
};
