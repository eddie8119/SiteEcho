/**
 * Subscription configuration for different user types
 */

export const SUBSCRIPTION_TYPES = {
  FREEMIUM: 'freemium',
  PAID: 'paid',
  DEVELOPER: 'developer',
} as const;

export type SubscriptionType = (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export const FREE_REPORT_LIMIT = 5;
export const FREE_FOLLOW_UP_LIMIT = 15;

export const MAX_PROJECT_COLLABORATORS = 5;

export const PADDLE_PRICE_IDS = {
  MONTHLY: process.env.PADDLE_PRICE_ID_PRO_MONTHLY || '',
  YEARLY: process.env.PADDLE_PRICE_ID_PRO_YEARLY || '',
} as const;

export interface SubscriptionPlanItem {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  interval: 'month' | 'year';
  features: string[];
}

export const SUBSCRIPTION_PLANS: SubscriptionPlanItem[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Basic features for personal project management',
    price: 0,
    currency: 'USD',
    interval: 'month',
    features: [
      '500 MB cloud storage',
      '5 report exports / month',
      '15 follow-up comparisons / month',
      'Basic photo timeline and capture',
    ],
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly',
    description: 'Complete toolset for professionals and site managers',
    price: 7.29,
    currency: 'USD',
    interval: 'month',
    features: [
      '20 GB cloud storage',
      'Unlimited report exports',
      'Unlimited follow-up comparisons',
      'Web access & real-time two-way sync',
      'Up to 5 collaborators per project',
    ],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Yearly',
    description: 'Save 20% with annual billing',
    price: 69.99,
    currency: 'USD',
    interval: 'year',
    features: [
      '20 GB cloud storage',
      'Unlimited report exports',
      'Unlimited follow-up comparisons',
      'Web access & real-time two-way sync',
      'Up to 5 collaborators per project',
      '20% savings vs monthly',
    ],
  },
];

export const APPLE_IAP_PRODUCT_IDS = {
  MONTHLY: 'com.SiteNear.pro.monthly',
  YEARLY: 'com.SiteNear.pro.yearly',
} as const;

export const GOOGLE_PLAY_PRODUCT = {
  SUBSCRIPTION_ID: 'SiteNear_pro',
  MONTHLY_BASE_PLAN_ID: 'monthly',
  YEARLY_BASE_PLAN_ID: 'yearly',
} as const;

export const SUBSCRIPTION_LIMITS: Record<
  SubscriptionType,
  {
    maxMembers: number;
    storageLimitBytes: number;
    usedStorageBytes: number;
    photoCount: number;
    reportExportMonthlyLimit: number;
    followUpMonthlyLimit: number;
  }
> = {
  freemium: {
    maxMembers: Infinity,
    storageLimitBytes: 500 * 1024 * 1024, // 500 MB
    usedStorageBytes: 0,
    photoCount: 0,
    reportExportMonthlyLimit: FREE_REPORT_LIMIT,
    followUpMonthlyLimit: FREE_FOLLOW_UP_LIMIT,
  },
  paid: {
    maxMembers: Infinity,
    storageLimitBytes: 20 * 1024 * 1024 * 1024, // 20 GB
    usedStorageBytes: 0,
    photoCount: 0,
    reportExportMonthlyLimit: Infinity,
    followUpMonthlyLimit: Infinity,
  },
  developer: {
    maxMembers: Infinity,
    storageLimitBytes: 10 * 1024 * 1024 * 1024, // 10GB
    usedStorageBytes: 0,
    photoCount: 0,
    reportExportMonthlyLimit: Infinity,
    followUpMonthlyLimit: Infinity,
  },
};
