import { google } from 'googleapis';
import { createHash } from 'node:crypto';

import { GOOGLE_PLAY_PRODUCT } from '@/config/subscriptionConfig';

export interface GooglePlayPurchaseInfo {
  packageName: string;
  productId: string;
  basePlanId?: string;
  purchaseToken: string;
  purchaseState: 'purchased' | 'pending' | 'unspecified';
  acknowledgementState: 'acknowledged' | 'unacknowledged' | 'unspecified';
  startTime?: Date;
  expiryTime?: Date;
  autoRenewing?: boolean;
  regionCode?: string;
  obfuscatedAccountId?: string;
  linkedPurchaseToken?: string;
  rawResponse: unknown;
  rawResponseHash: string;
}

interface GooglePlaySubscriptionsv2Response {
  subscriptionState?: string;
  acknowledgementState?: string;
  productId?: string;
  startTime?: string;
  autoRenewing?: boolean;
  regionCode?: string;
  obfuscatedExternalAccountId?: string;
  linkedPurchaseToken?: string;
  lineItems?: Array<{
    productId?: string;
    basePlanId?: string;
    expiryTime?: string;
  }>;
  [key: string]: unknown;
}

export interface GooglePlayVerificationResult {
  isValid: boolean;
  purchaseInfo?: GooglePlayPurchaseInfo;
  error?: string;
  responseCode?: number;
}

const ALLOWED_BASE_PLAN_IDS = new Set<string>([
  GOOGLE_PLAY_PRODUCT.MONTHLY_BASE_PLAN_ID,
  GOOGLE_PLAY_PRODUCT.YEARLY_BASE_PLAN_ID,
]);

export const isGooglePlayVerificationEnabled = () =>
  process.env.GOOGLE_PLAY_VERIFY_ENABLED === 'true';

export const getGooglePlayPackageName = () =>
  process.env.GOOGLE_PLAY_PACKAGE_NAME || 'com.SiteNear.fieldalbum';

let androidPublisher: ReturnType<typeof google.androidpublisher> | null = null;
let initPromise: Promise<void> | null = null;

const ensurePublisher = async () => {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const credentialsJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
    if (!credentialsJson) {
      throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON is not configured');
    }

    const credentials = JSON.parse(credentialsJson);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/androidpublisher'],
    });

    androidPublisher = google.androidpublisher({ version: 'v3', auth });
  })();

  return initPromise;
};

/**
 * Verify a Google Play purchase token using the Developer API.
 * Returns failure without validating Pro if the state is not purchased or expired.
 */
export const verifyGooglePlayPurchase = async (
  purchaseToken: string,
  providedPackageName?: string
): Promise<GooglePlayVerificationResult> => {
  if (!isGooglePlayVerificationEnabled()) {
    return { isValid: false, error: 'Google Play verification is disabled' };
  }

  try {
    await ensurePublisher();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to initialize Google Play client';
    console.error('[GooglePlayVerification] Initialization failed:', message);
    return { isValid: false, error: message };
  }

  const packageName = getGooglePlayPackageName();

  // Reject mismatched package name from client
  if (providedPackageName && providedPackageName !== packageName) {
    return { isValid: false, error: 'Package name mismatch' };
  }

  if (!androidPublisher) {
    return { isValid: false, error: 'Google Play publisher not initialized' };
  }

  try {
    const response = await androidPublisher.purchases.subscriptionsv2.get({
      packageName,
      token: purchaseToken,
    });

    const data = response.data as GooglePlaySubscriptionsv2Response;
    const rawResponse = data;
    const rawResponseHash = createHash('sha256').update(JSON.stringify(data)).digest('hex');

    const subscriptionState = data.subscriptionState;
    const lineItems = data.lineItems ?? [];
    const lineItem = lineItems[0];
    const productId = data.productId ?? lineItem?.productId ?? '';
    const basePlanId = lineItem?.expiryTime ? lineItem.basePlanId : undefined;

    if (productId !== GOOGLE_PLAY_PRODUCT.SUBSCRIPTION_ID) {
      return {
        isValid: false,
        error: `Product ID not in allowlist: ${productId}`,
        purchaseInfo: buildPurchaseInfo(
          data,
          packageName,
          purchaseToken,
          rawResponse,
          rawResponseHash
        ),
      };
    }

    if (basePlanId && !ALLOWED_BASE_PLAN_IDS.has(basePlanId)) {
      return {
        isValid: false,
        error: `Base plan not in allowlist: ${basePlanId}`,
        purchaseInfo: buildPurchaseInfo(
          data,
          packageName,
          purchaseToken,
          rawResponse,
          rawResponseHash
        ),
      };
    }

    // Allow only active/purchased states
    const allowedStates = ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'];
    if (!allowedStates.includes(subscriptionState ?? '')) {
      return {
        isValid: false,
        error: `Subscription state not eligible: ${subscriptionState}`,
        purchaseInfo: buildPurchaseInfo(
          data,
          packageName,
          purchaseToken,
          rawResponse,
          rawResponseHash
        ),
      };
    }

    const purchaseState =
      data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
        ? 'purchased'
        : 'purchased';

    const info: GooglePlayPurchaseInfo = {
      ...buildPurchaseInfo(data, packageName, purchaseToken, rawResponse, rawResponseHash),
      purchaseState,
      acknowledgementState:
        data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
          ? 'acknowledged'
          : 'unacknowledged',
      linkedPurchaseToken: data.linkedPurchaseToken,
    };

    return { isValid: true, purchaseInfo: info };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Google Play API call failed';
    console.error('[GooglePlayVerification] API call failed:', message);
    return { isValid: false, error: message };
  }
};

const buildPurchaseInfo = (
  data: GooglePlaySubscriptionsv2Response,
  packageName: string,
  purchaseToken: string,
  rawResponse: unknown,
  rawResponseHash: string
): GooglePlayPurchaseInfo => {
  const lineItems = data.lineItems ?? [];
  const lineItem = lineItems[0];

  return {
    packageName,
    productId: data.productId ?? lineItem?.productId ?? '',
    basePlanId: lineItem?.basePlanId,
    purchaseToken,
    purchaseState:
      data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
        ? 'purchased'
        : 'purchased',
    acknowledgementState:
      data.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_ACKNOWLEDGED'
        ? 'acknowledged'
        : 'unacknowledged',
    startTime: data.startTime ? new Date(Number(data.startTime)) : undefined,
    expiryTime: lineItem?.expiryTime ? new Date(Number(lineItem.expiryTime)) : undefined,
    autoRenewing: data.autoRenewing ?? undefined,
    regionCode: data.regionCode ?? undefined,
    obfuscatedAccountId: data.obfuscatedExternalAccountId ?? undefined,
    linkedPurchaseToken: data.linkedPurchaseToken ?? undefined,
    rawResponse,
    rawResponseHash,
  };
};

export const acknowledgeGooglePlayPurchase = async (
  purchaseToken: string
): Promise<{ success: boolean; error?: string }> => {
  if (!isGooglePlayVerificationEnabled() || !androidPublisher) {
    return { success: false, error: 'Google Play verification is disabled or not initialized' };
  }

  try {
    const packageName = getGooglePlayPackageName();
    await androidPublisher.purchases.subscriptions.acknowledge({
      packageName,
      subscriptionId: GOOGLE_PLAY_PRODUCT.SUBSCRIPTION_ID,
      token: purchaseToken,
    });
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Acknowledge failed';
    console.error('[GooglePlayVerification] Acknowledge failed:', message);
    return { success: false, error: message };
  }
};
