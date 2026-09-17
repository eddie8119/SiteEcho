import express from 'express';

import {
  handleAppleWebhook,
  restoreApplePurchases,
  verifyAppleReceipt,
} from '@/controllers/appleBilling';
import {
  cancelSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
  getBillingStatus,
  getSubscriptionPlans,
  getUserSubscription,
  resumeSubscription,
} from '@/controllers/billing';
import { handleGoogleRtdn, verifyGooglePurchase } from '@/controllers/googleBilling';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

router.get('/status', getBillingStatus);
router.get('/plans', getSubscriptionPlans);
router.get('/subscription', authMiddleware, requireUserId, getUserSubscription);
router.post('/checkout-session', authMiddleware, requireUserId, createCheckoutSession);
router.post('/portal-session', authMiddleware, requireUserId, createCustomerPortalSession);
router.post('/cancel', authMiddleware, requireUserId, cancelSubscription);
router.post('/resume', authMiddleware, requireUserId, resumeSubscription);

// Apple IAP Routes
router.post('/apple/verify-receipt', authMiddleware, requireUserId, verifyAppleReceipt);
router.post('/apple/restore', authMiddleware, requireUserId, restoreApplePurchases);
router.post('/apple/webhook', handleAppleWebhook);

// Google Play Billing Routes
router.post('/google/verify-purchase', authMiddleware, requireUserId, verifyGooglePurchase);
router.post('/google/rtdn', handleGoogleRtdn);

export default router;
