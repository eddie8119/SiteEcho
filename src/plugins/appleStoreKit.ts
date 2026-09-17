import { registerPlugin } from '@capacitor/core';

import type {
  StoreKitProductDiagnostics,
  StoreKitProductMap,
  StoreKitProductMetadata,
  StoreKitProductsResponse,
  StoreKitPurchaseResponse,
  StoreKitRestoredTransaction,
  StoreKitTransactionUpdate,
} from '@/types/billing';

export interface AppleStoreKitPlugin {
  getProducts(): Promise<StoreKitProductsResponse>;
  purchase(options: { productId: string }): Promise<StoreKitPurchaseResponse>;
  finishTransaction(options: { transactionId: string }): Promise<void>;
  restorePurchases(): Promise<{
    result: string;
    restoredTransactions: StoreKitRestoredTransaction[];
  }>;
  addListener(
    eventName: 'transactionUpdated',
    listenerFunc: (data: StoreKitTransactionUpdate) => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

export const AppleStoreKit = registerPlugin<AppleStoreKitPlugin>('AppleStoreKitPlugin', {
  web: () => import('./appleStoreKit.web').then((m) => new m.AppleStoreKitWeb()),
});

export type {
  StoreKitProductDiagnostics,
  StoreKitProductMap,
  StoreKitProductMetadata,
  StoreKitProductsResponse,
};
