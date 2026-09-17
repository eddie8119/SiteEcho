import { registerPlugin } from '@capacitor/core';

export interface GooglePlayPricingPhase {
  formattedPrice: string;
  priceAmountMicros: number;
  priceCurrencyCode: string;
  billingPeriod: string;
  billingCycleCount: number;
  recurrenceMode: number;
}

export interface GooglePlayOffer {
  offerId?: string;
  offerToken: string;
  basePlanId: string;
  pricingPhases: GooglePlayPricingPhase[];
}

export interface GooglePlayProductDetails {
  productId: string;
  productType: string;
  name: string;
  title: string;
  description: string;
  offers: GooglePlayOffer[];
}

export interface GooglePlayPurchase {
  purchaseToken: string;
  productIds: string[];
  packageName: string;
  purchaseState: number;
  acknowledged: boolean;
  autoRenewing: boolean;
  purchaseTime: number;
  orderId?: string;
  obfuscatedAccountId?: string;
}

export interface GooglePlayProductsResponse {
  products: GooglePlayProductDetails[];
}

export interface GooglePlayPurchasesResponse {
  purchases: GooglePlayPurchase[];
}

export interface GooglePlayBillingFlowResult {
  billingFlowStarted: boolean;
  responseCode: number;
  debugMessage: string;
}

export interface GooglePlayAcknowledgeResult {
  success: boolean;
  responseCode: number;
  debugMessage: string;
}

export interface GooglePlayBillingInitializeResult {
  success: boolean;
  connected: boolean;
  alreadyInitialized?: boolean;
}

export interface GooglePlayBillingConnectionChange {
  connected: boolean;
  status: string;
}

export interface GooglePlayBillingPurchaseUpdate {
  purchases: GooglePlayPurchase[];
  responseCode: number;
  debugMessage: string;
}

export interface GooglePlayBillingPlugin {
  initialize(): Promise<GooglePlayBillingInitializeResult>;
  getProducts(): Promise<GooglePlayProductsResponse>;
  purchase(options: {
    basePlanId: string;
    obfuscatedAccountId?: string;
  }): Promise<GooglePlayBillingFlowResult>;
  queryPurchases(): Promise<GooglePlayPurchasesResponse>;
  openSubscriptionManagement(): Promise<{ opened: boolean }>;
  acknowledgePurchase(options: { purchaseToken: string }): Promise<GooglePlayAcknowledgeResult>;
  addListener(
    eventName: 'purchaseUpdated',
    listenerFunc: (data: GooglePlayBillingPurchaseUpdate) => void
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: 'billingConnectionChanged',
    listenerFunc: (data: GooglePlayBillingConnectionChange) => void
  ): Promise<{ remove: () => void }>;
  removeAllListeners(): Promise<void>;
}

export const GooglePlayBilling = registerPlugin<GooglePlayBillingPlugin>('GooglePlayBilling', {
  web: () => import('./googlePlayBilling.web').then((m) => new m.GooglePlayBillingWeb()),
});
