import { MAX_PROJECT_COLLABORATORS } from '@/constants/project';

export type PlanTier = 'free' | 'pro';
export type BillingPlatform = 'app_iap' | 'web';
export type CurrencyCode = 'USD' | 'TWD';

export interface PlanLimit {
  storageBytes: number;
  reportExportMonthlyLimit: number | typeof Infinity;
  followUpMonthlyLimit: number | typeof Infinity;
}

export const FREE_REPORT_LIMIT = 5;
export const FREE_FOLLOW_UP_LIMIT = 15;

export const PLAN_CONFIG: Record<PlanTier, PlanLimit> = {
  free: {
    storageBytes: 500 * 1024 * 1024, // 500 MB
    reportExportMonthlyLimit: FREE_REPORT_LIMIT,
    followUpMonthlyLimit: FREE_FOLLOW_UP_LIMIT,
  },
  pro: {
    storageBytes: 20 * 1024 * 1024 * 1024, // 20 GB
    reportExportMonthlyLimit: Infinity,
    followUpMonthlyLimit: Infinity,
  },
};

export interface PlanPriceInfo {
  currency: CurrencyCode;
  currencySymbol: string;
  monthlyPrice: string;
  yearlyPrice: string;
  monthlyInYearly: string;
  yearlySavingsPercent: string;
  productIdMonthly?: string;
  productIdYearly?: string;
  paddlePriceIdMonthly?: string;
  paddlePriceIdYearly?: string;
  hasFreeTrial: boolean;
  trialDays: number;
}

// StoreKit Product IDs for Apple IAP
export const APPLE_IAP_PRODUCT_IDS = {
  MONTHLY: 'com.SiteNear.pro.monthly',
  YEARLY: 'com.SiteNear.pro.yearly',
} as const;

// Google Play Subscription and Base Plan IDs
export const GOOGLE_PLAY_PRODUCT = {
  SUBSCRIPTION_ID: 'SiteNear_pro',
  MONTHLY_BASE_PLAN_ID: 'monthly',
  YEARLY_BASE_PLAN_ID: 'yearly',
} as const;

// Pricing Matrix: Web is ~8% cheaper than App Store IAP; all prices end in 9
export const PRICING_MATRIX: Record<BillingPlatform, Record<CurrencyCode, PlanPriceInfo>> = {
  app_iap: {
    USD: {
      currency: 'USD',
      currencySymbol: '$',
      monthlyPrice: '7.99',
      yearlyPrice: '75.99',
      monthlyInYearly: '6.33',
      yearlySavingsPercent: '21',
      productIdMonthly: APPLE_IAP_PRODUCT_IDS.MONTHLY,
      productIdYearly: APPLE_IAP_PRODUCT_IDS.YEARLY,
      hasFreeTrial: true,
      trialDays: 14,
    },
    TWD: {
      currency: 'TWD',
      currencySymbol: 'NT$',
      monthlyPrice: '259',
      yearlyPrice: '2499',
      monthlyInYearly: '208',
      yearlySavingsPercent: '20',
      productIdMonthly: APPLE_IAP_PRODUCT_IDS.MONTHLY,
      productIdYearly: APPLE_IAP_PRODUCT_IDS.YEARLY,
      hasFreeTrial: true,
      trialDays: 14,
    },
  },
  web: {
    USD: {
      currency: 'USD',
      currencySymbol: '$',
      monthlyPrice: '7.29',
      yearlyPrice: '69.99',
      monthlyInYearly: '5.83',
      yearlySavingsPercent: '20',
      paddlePriceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_MONTHLY as string | undefined,
      paddlePriceIdYearly: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_YEARLY as string | undefined,
      hasFreeTrial: true,
      trialDays: 14,
    },
    TWD: {
      currency: 'TWD',
      currencySymbol: 'NT$',
      monthlyPrice: '239',
      yearlyPrice: '2299',
      monthlyInYearly: '191',
      yearlySavingsPercent: '20',
      paddlePriceIdMonthly: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_MONTHLY as string | undefined,
      paddlePriceIdYearly: import.meta.env.VITE_PADDLE_PRICE_ID_PRO_YEARLY as string | undefined,
      hasFreeTrial: true,
      trialDays: 14,
    },
  },
};

export interface PlanFeatureItem {
  key: string;
  labelKey?: string;
  defaultLabel: string;
  valueKey?: Partial<Record<PlanTier, string>>;
  valueParams?: Partial<Record<PlanTier, Record<string, unknown>>>;
  values: Record<PlanTier, 'check' | 'dash' | string>;
}

export const PLAN_FEATURE_COMPARISON: PlanFeatureItem[] = [
  {
    key: 'photo',
    labelKey: 'billing.featureComparison.photo',
    defaultLabel: '本地無限照片',
    values: { free: 'check', pro: 'check' },
  },
  {
    key: 'fastCapture',
    labelKey: 'billing.featureComparison.fastCapture',
    defaultLabel: '超快拍照（無確認中斷）',
    values: { free: 'check', pro: 'check' },
  },
  {
    key: 'basicOrganize',
    labelKey: 'billing.featureComparison.basicOrganize',
    defaultLabel: '基本整理（空間/工項/待辦）',
    values: { free: 'check', pro: 'check' },
  },
  {
    key: 'timeSpace',
    labelKey: 'billing.featureComparison.timeSpace',
    defaultLabel: '時間/空間瀏覽',
    values: { free: 'check', pro: 'check' },
  },
  {
    key: 'share',
    labelKey: 'billing.featureComparison.share',
    defaultLabel: '分享至其他 App',
    values: { free: 'check', pro: 'check' },
  },
  {
    key: 'teamMembers',
    labelKey: 'billing.featureComparison.teamMembers',
    defaultLabel: '團隊成員協作',
    valueKey: { pro: 'billing.featureComparison.teamMembersProValue' },
    valueParams: { pro: { count: MAX_PROJECT_COLLABORATORS } },
    values: { free: 'dash', pro: `${MAX_PROJECT_COLLABORATORS}` },
  },
  {
    key: 'cloudBackup',
    labelKey: 'billing.featureComparison.cloudBackup',
    defaultLabel: '雲端備份',
    values: { free: '500 MB', pro: '20 GB' },
  },
  {
    key: 'webView',
    labelKey: 'billing.featureComparison.webView',
    defaultLabel: 'Web 端檢視與編輯',
    valueKey: { pro: 'billing.featureComparison.webViewProValue' },
    values: { free: 'dash', pro: '完整編輯（雙向同步）' },
  },
  {
    key: 'evidenceChain',
    labelKey: 'billing.featureComparison.evidenceChain',
    defaultLabel: '解決問題跟蹤功能（問題解決前後對比）',
    valueKey: { free: 'billing.featureComparison.evidenceChainFreeValue' },
    valueParams: { free: { count: FREE_FOLLOW_UP_LIMIT } },
    values: { free: `${FREE_FOLLOW_UP_LIMIT} 次/月`, pro: 'check' },
  },
  {
    key: 'reportExport',
    labelKey: 'billing.featureComparison.reportExport',
    defaultLabel: '報告匯出（PDF / Word）',
    valueKey: { free: 'billing.featureComparison.reportExportFreeValue' },
    valueParams: { free: { count: FREE_REPORT_LIMIT } },
    values: { free: `${FREE_REPORT_LIMIT} 次/月`, pro: 'check' },
  },
];
