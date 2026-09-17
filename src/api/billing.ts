import type { SubscriptionPlan, UpgradeSubscriptionMode, UserSubscription } from '@/types/billing';
import type { ApiResponse } from '@/types/request';

import request from '@/utils/request';

export interface BillingStatus {
  enabled: boolean;
}

export interface VerifyReceiptRequestBody {
  transactionJws: string; // Stage 2: Only send verified JWS to backend
}

export const billingApi = {
  getBillingStatus: (): Promise<ApiResponse<BillingStatus>> => {
    return request.get('/billing/status');
  },
  createCheckoutSession: (planId: string, options?: { upgradeMode?: UpgradeSubscriptionMode }) => {
    return request.post('/billing/checkout-session', {
      planId,
      upgradeMode: options?.upgradeMode,
    });
  },
  createCustomerPortalSession: () => {
    return request.post('/billing/portal-session');
  },
  getSubscriptionPlans: (): Promise<ApiResponse<SubscriptionPlan[]>> => {
    return request.get('/billing/plans');
  },
  getUserSubscription: (): Promise<ApiResponse<UserSubscription | null>> => {
    return request.get('/billing/subscription');
  },
  cancelSubscription: (): Promise<ApiResponse<void>> => {
    return request.post('/billing/cancel');
  },
  resumeSubscription: (): Promise<ApiResponse<void>> => {
    return request.post('/billing/resume');
  },
  verifyAppleReceipt: (payload: VerifyReceiptRequestBody) => {
    return request.post('/billing/apple/verify-receipt', payload);
  },
  restoreApplePurchases: (transactionJws: string) => {
    // Stage 2: Require transactionJws instead of originalTransactionId
    return request.post('/billing/apple/restore', { transactionJws });
  },
  verifyGooglePurchase: (payload: { purchaseToken: string; productId: string }) => {
    return request.post('/billing/google/verify-purchase', payload);
  },
};
