export type StoreKitSubscriptionPeriodUnit = 'day' | 'week' | 'month' | 'year';

export interface StoreKitSubscriptionOfferMetadata {
  displayPrice: string;
  period?: {
    value: number;
    unit: StoreKitSubscriptionPeriodUnit;
  };
  periodCount?: number;
  localizedDescription?: string;
}

export interface StoreKitProductMetadata {
  productId: string;
  displayName: string;
  displayDescription: string;
  displayPrice: string;
  currencyCode?: string;
  subscriptionGroupId?: string;
  isEligibleForIntroOffer?: boolean;
  subscriptionPeriod?: {
    value: number;
    unit: StoreKitSubscriptionPeriodUnit;
  };
  introductoryOffer?: StoreKitSubscriptionOfferMetadata;
}

export type StoreKitProductMap = Record<string, StoreKitProductMetadata>;

export interface StoreKitProductDiagnostics {
  expectedProductIds: string[];
  returnedProductIds: string[];
  missingProductIds: string[];
  duplicateProductIds: string[];
  unexpectedProductIds: string[];
}

export interface StoreKitProductsResponse {
  products: StoreKitProductMetadata[];
  diagnostics?: StoreKitProductDiagnostics;
}

// Stage 2: Transaction data shared across purchase, transaction update, and restore
export interface StoreKitVerifiedTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  transactionJws: string;
  result: 'verified';
}

export interface StoreKitUnverifiedTransaction {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  result: 'unverified';
}

export type StoreKitTransactionUpdate = StoreKitVerifiedTransaction | StoreKitUnverifiedTransaction;

export interface StoreKitRestoredTransaction extends StoreKitVerifiedTransaction {
  isRevoked: boolean;
  isExpired: boolean;
}

export interface StoreKitPurchaseSuccess {
  result: 'success';
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  transactionJws: string;
}

export interface StoreKitPurchasePending {
  result: 'pending';
  productId: string;
}

export interface StoreKitPurchaseUserCancelled {
  result: 'userCancelled';
  productId: string;
}

export interface StoreKitPurchaseUnverified {
  result: 'unverified';
  error: string;
}

export interface StoreKitPurchaseUnknown {
  result: 'unknown';
  error?: string;
}

export type StoreKitPurchaseResponse =
  | StoreKitPurchaseSuccess
  | StoreKitPurchasePending
  | StoreKitPurchaseUserCancelled
  | StoreKitPurchaseUnverified
  | StoreKitPurchaseUnknown;

export interface PricingMenuPlan {
  id: string;
  title: string;
  currencySymbol: string;
  price: string;
  currency: string;
  borderClass: string;
  titleClass: string;
  buttonClass: string;
  checkClass: string;
  buttonText: string;
  features: string[];
  contactSales?: boolean;
  note?: string;
  annualPrice?: string;
  annualMonthlyPrice?: string;
  annualSavings?: string;
  platform?: 'app_iap' | 'web';
  productIdMonthly?: string;
  productIdYearly?: string;
  paddlePriceIdMonthly?: string;
  paddlePriceIdYearly?: string;
  badgeText?: string;
  nativePriceLabel?: string;
  nativePricePeriod?: StoreKitProductMetadata['subscriptionPeriod'];
  nativeAnnualPriceLabel?: string;
  nativeAnnualPricePeriod?: StoreKitProductMetadata['subscriptionPeriod'];
  isEligibleForIntroOffer?: boolean;
  hasFreeTrial?: boolean;
  trialDays?: number;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

export const SUBSCRIPTION_TYPES = {
  FREEMIUM: 'freemium',
  PAID: 'paid',
  DEVELOPER: 'developer',
} as const;

export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export const UPGRADE_SUBSCRIPTION_MODES = {
  IMMEDIATE: 'immediate',
  NEXT_RENEWAL: 'next_renewal',
} as const;

export type UpgradeSubscriptionMode =
  (typeof UPGRADE_SUBSCRIPTION_MODES)[keyof typeof UPGRADE_SUBSCRIPTION_MODES];

export interface UserSubscription {
  id: string;
  userId: string;
  plan: string;
  status: 'active' | 'inactive' | 'cancelled' | 'pastDue';
  subscriptionType?: SubscriptionType;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  createdAt: string;
  updatedAt: string;
}

export const USAGE_ACTION_TYPES = {
  REPORT_EXPORT: 'report_export',
  FOLLOW_UP_PHOTO: 'follow_up_photo',
} as const;

export type UsageActionType = (typeof USAGE_ACTION_TYPES)[keyof typeof USAGE_ACTION_TYPES];

export interface UsageConsumption {
  allowed: boolean;
  remaining: number;
  limit: number;
  currentUsage: number;
  isPaid: boolean;
}

// 業務邏輯上的分類（paid/freemium）與配套資訊
export interface SubscriptionInfo {
  subscription: UserSubscription | null;
  subscriptionType: SubscriptionType;
  limits: {
    maxMembers: number;
    storageLimitBytes: number;
    usedStorageBytes: number;
    photoCount: number;
    reportExportMonthlyLimit: number;
    followUpMonthlyLimit: number;
    usedReportExports: number;
    usedFollowUps: number;
    remainingReportExports: number;
    remainingFollowUps: number;
  };
}

export interface SubscriptionLimits {
  subscriptionType: SubscriptionType;
  limits: {
    maxMembers: number;
    storageLimitBytes: number;
  };
}

export interface UserUsage {
  isPaid: boolean;
  usedReportExports: number;
  usedFollowUps: number;
  reportExportMonthlyLimit: number;
  followUpMonthlyLimit: number;
  remainingReportExports: number;
  remainingFollowUps: number;
}
