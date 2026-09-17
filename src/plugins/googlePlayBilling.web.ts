import type { GooglePlayBillingPlugin } from './googlePlayBilling';

const NOT_AVAILABLE = 'Google Play Billing is only available on Android native app';

export class GooglePlayBillingWeb implements GooglePlayBillingPlugin {
  async initialize() {
    return {
      success: false,
      connected: false,
      alreadyInitialized: false,
    };
  }

  async getProducts() {
    return { products: [] };
  }

  async purchase() {
    return {
      billingFlowStarted: false,
      responseCode: -1,
      debugMessage: NOT_AVAILABLE,
    };
  }

  async queryPurchases() {
    return { purchases: [] };
  }

  async openSubscriptionManagement() {
    return { opened: false };
  }

  async acknowledgePurchase() {
    return {
      success: false,
      responseCode: -1,
      debugMessage: NOT_AVAILABLE,
    };
  }

  async addListener() {
    return {
      remove: () => {
        // No-op for web
      },
    };
  }

  async removeAllListeners() {
    // No-op for web
  }
}
