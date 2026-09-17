import type { AppleStoreKitPlugin } from './appleStoreKit';
import type {
  StoreKitProductMetadata,
  StoreKitPurchaseResponse,
  StoreKitRestoredTransaction,
} from '@/types/billing';

export class AppleStoreKitWeb implements AppleStoreKitPlugin {
  async getProducts(): Promise<{ products: StoreKitProductMetadata[] }> {
    return { products: [] };
  }

  async purchase(): Promise<StoreKitPurchaseResponse> {
    return {
      result: 'unknown',
      error: 'Apple IAP is only available on iOS native app',
    };
  }

  async finishTransaction(): Promise<void> {
    throw new Error('Apple IAP is only available on iOS native app');
  }

  async restorePurchases(): Promise<{
    result: string;
    restoredTransactions: StoreKitRestoredTransaction[];
  }> {
    return {
      result: 'unknown',
      restoredTransactions: [],
    };
  }

  async addListener(): Promise<{ remove: () => void }> {
    // Web implementation doesn't support transaction listeners
    return {
      remove: () => {
        // No-op for web
      },
    };
  }

  async removeAllListeners(): Promise<void> {
    // No-op for web
  }
}
