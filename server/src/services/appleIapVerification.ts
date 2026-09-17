import {
  Environment,
  JWSTransactionDecodedPayload,
  SignedDataVerifier,
} from '@apple/app-store-server-library';
import fs from 'fs/promises';
import { Buffer } from 'node:buffer';
import path from 'path';

import { APPLE_IAP_PRODUCT_IDS } from '@/config/subscriptionConfig';

export interface AppleTransactionInfo {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: number;
  expiresDate: number;
  environment: 'Sandbox' | 'Production';
  bundleId: string;
  subscriptionStatus?: string;
  revocationDate?: number;
  revocationReason?: number;
}

export interface AppleVerificationResult {
  isValid: boolean;
  transactionInfo?: AppleTransactionInfo;
  error?: string;
}

export type AppleNotificationType =
  | 'SUBSCRIBED'
  | 'DID_RENEW'
  | 'DID_FAIL_TO_RENEW'
  | 'EXPIRED'
  | 'REFUND'
  | 'REVOKE'
  | 'GRACE_PERIOD_EXPIRED'
  | 'OFFER_REDEEMED'
  | 'PRICE_INCREASE'
  | 'REFUND_DECLINED'
  | 'RENEWAL_EXTENDED'
  | 'TEST'
  | string;

export interface AppleServerNotificationData {
  notificationType: AppleNotificationType;
  subtype?: string;
  notificationUUID: string;
  signedDate: number;
  environment?: 'Sandbox' | 'Production';
  bundleId?: string;
  transactionInfo?: AppleTransactionInfo;
  rawPayload?: Record<string, unknown>;
}

export interface AppleNotificationVerificationResult {
  isValid: boolean;
  notification?: AppleServerNotificationData;
  error?: string;
}

const PRODUCT_ID_ALLOWLIST = new Set<string>(Object.values(APPLE_IAP_PRODUCT_IDS));

/**
 * Stage 3: Apple IAP Verification Service
 * Uses Apple's official SignedDataVerifier for JWS signature verification.
 * Fail closed if root certificates are missing or verifier cannot be initialized.
 */
export class AppleIapVerificationService {
  private bundleId: string;
  private environment: Environment;
  private verifier: SignedDataVerifier | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    this.bundleId = process.env.APPLE_IAP_BUNDLE_ID || 'com.SiteNear.fieldalbum';
    this.environment =
      process.env.APPLE_IAP_ENVIRONMENT === 'Production'
        ? Environment.PRODUCTION
        : Environment.SANDBOX;
  }

  /**
   * Initialize the SignedDataVerifier once.
   * Loads DER-encoded Apple root certificates from APPLE_IAP_ROOT_CERTS_PATH.
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const certBuffers = await this.loadRootCertificates();
      if (certBuffers.length === 0) {
        throw new Error(
          'Apple root certificates not found. Place .cer files in the path set by APPLE_IAP_ROOT_CERTS_PATH.'
        );
      }

      const appAppleId = process.env.APPLE_IAP_APP_ID
        ? Number(process.env.APPLE_IAP_APP_ID)
        : undefined;
      const enableOnlineChecks =
        this.environment === Environment.PRODUCTION
          ? process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS !== 'false'
          : process.env.APPLE_IAP_ENABLE_ONLINE_CHECKS === 'true';

      this.verifier = new SignedDataVerifier(
        certBuffers,
        enableOnlineChecks,
        this.environment,
        this.bundleId,
        appAppleId
      );

      console.info('[AppleIAP] SignedDataVerifier initialized for', this.environment);
    } catch (error) {
      this.verifier = null;
      console.error('[AppleIAP] Failed to initialize SignedDataVerifier:', error);
    }
  }

  private async loadRootCertificates(): Promise<Buffer[]> {
    const certsPath = process.env.APPLE_IAP_ROOT_CERTS_PATH || path.resolve('certs');
    const files = await fs.readdir(certsPath).catch(() => []);
    const certFiles = files.filter((f) =>
      ['.cer', '.pem', '.der', '.crt'].some((ext) => f.toLowerCase().endsWith(ext))
    );

    const certBuffers = await Promise.all(
      certFiles.map((f) => fs.readFile(path.join(certsPath, f)))
    );
    return certBuffers;
  }

  isInitialized(): boolean {
    return this.verifier !== null;
  }

  /**
   * Verify a signed transaction JWS using Apple's SignedDataVerifier.
   * All database fields are derived from the verified, decoded payload only.
   */
  async verifyTransactionJws(transactionJws?: string): Promise<AppleVerificationResult> {
    await this.initialize();

    if (!this.verifier) {
      return {
        isValid: false,
        error: 'Apple JWS verifier is not initialized',
      };
    }

    if (!transactionJws) {
      return {
        isValid: false,
        error: 'transactionJws is required for verification',
      };
    }

    try {
      console.info('[AppleIAP] Starting JWS verification...');
      const decoded: JWSTransactionDecodedPayload = await Promise.race([
        this.verifier.verifyAndDecodeTransaction(transactionJws),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('JWS verification timed out after 10s')), 10000)
        ),
      ]);
      console.info('[AppleIAP] JWS verification completed');

      // SignedDataVerifier already validates bundleId and environment.
      // We keep redundant checks for product ID and business rules.
      const transactionId = String(decoded.transactionId ?? '');
      const originalTransactionId = String(decoded.originalTransactionId ?? '');
      const productId = String(decoded.productId ?? '');
      const bundleId = String(decoded.bundleId ?? '');
      const environment = decoded.environment as 'Sandbox' | 'Production';
      const purchaseDate = Number(decoded.purchaseDate ?? decoded.originalPurchaseDate ?? 0);
      const expiresDate = Number(decoded.expiresDate ?? 0);
      const revocationDate = decoded.revocationDate ? Number(decoded.revocationDate) : undefined;
      const revocationReason = decoded.revocationReason as number | undefined;

      if (!transactionId || !originalTransactionId || !productId || !bundleId) {
        return {
          isValid: false,
          error: 'Missing required transaction parameters',
        };
      }

      // Environment must match the configured verifier environment (fail closed)
      if (environment !== this.environment) {
        return {
          isValid: false,
          error: `Environment mismatch: expected ${this.environment}, got ${environment}`,
        };
      }

      // Product ID allowlist (server-side final guard)
      if (!PRODUCT_ID_ALLOWLIST.has(productId)) {
        return {
          isValid: false,
          error: `Product ID not in allowlist: ${productId}`,
        };
      }

      // Revocation / refund
      if (revocationDate !== undefined && revocationDate > 0) {
        return {
          isValid: false,
          error: `Transaction is revoked (reason: ${revocationReason ?? 'unknown'})`,
        };
      }

      const isExpired = expiresDate > 0 && expiresDate < Date.now();

      const verifiedTransactionInfo: AppleTransactionInfo = {
        transactionId,
        originalTransactionId,
        productId,
        purchaseDate,
        expiresDate,
        environment,
        bundleId,
        subscriptionStatus: isExpired ? 'expired' : 'active',
        revocationDate,
        revocationReason,
      };

      return {
        isValid: true,
        transactionInfo: verifiedTransactionInfo,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown verification error';
      console.error('[AppleIAP] JWS verification failed:', message);
      return {
        isValid: false,
        error: message,
      };
    }
  }

  /**
   * Verify and decode App Store Server Notifications V2 payload
   */
  async verifyAndDecodeNotification(
    signedPayload?: string
  ): Promise<AppleNotificationVerificationResult> {
    await this.initialize();

    if (!this.verifier) {
      return {
        isValid: false,
        error: 'Apple JWS verifier is not initialized',
      };
    }

    if (!signedPayload) {
      return {
        isValid: false,
        error: 'Missing signedPayload',
      };
    }

    try {
      const decoded = await this.verifier.verifyAndDecodeNotification(signedPayload);

      const notificationType = (decoded.notificationType as AppleNotificationType) || 'UNKNOWN';
      const subtype = (decoded.subtype as string | undefined) || undefined;
      const notificationUUID = String(decoded.notificationUUID ?? '');
      const signedDate = Number(decoded.signedDate ?? Date.now());

      const data = (decoded.data as Record<string, unknown> | undefined) || {};
      const bundleId = (data.bundleId as string | undefined) || undefined;
      const environment = (data.environment as 'Sandbox' | 'Production' | undefined) || undefined;
      const signedTransactionInfo = (data.signedTransactionInfo as string | undefined) || undefined;

      if (bundleId && bundleId !== this.bundleId) {
        return {
          isValid: false,
          error: `Bundle ID mismatch: expected ${this.bundleId}, got ${bundleId}`,
        };
      }

      let transactionInfo: AppleTransactionInfo | undefined;
      if (signedTransactionInfo) {
        const txResult = await this.verifyTransactionJws(signedTransactionInfo);
        if (txResult.isValid && txResult.transactionInfo) {
          transactionInfo = txResult.transactionInfo;
        }
      }

      // Stage 5: Verify signed renewal info if present (for notifications that include it)
      const signedRenewalInfo = (data.signedRenewalInfo as string | undefined) || undefined;
      if (signedRenewalInfo) {
        await this.verifier.verifyAndDecodeRenewalInfo(signedRenewalInfo);
      }

      return {
        isValid: true,
        notification: {
          notificationType,
          subtype,
          notificationUUID,
          signedDate,
          environment,
          bundleId,
          transactionInfo,
          rawPayload: decoded as unknown as Record<string, unknown>,
        },
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unknown notification verification error';
      console.error('[AppleIAP] Server notification verification failed:', message);
      return {
        isValid: false,
        error: message,
      };
    }
  }
}

// Singleton instance
let verificationService: AppleIapVerificationService | null = null;

export const getAppleIapVerificationService = (): AppleIapVerificationService => {
  if (!verificationService) {
    verificationService = new AppleIapVerificationService();
    verificationService.initialize().catch((err) => {
      console.error('[AppleIAP] Initializer rejected:', err);
    });
  }
  return verificationService;
};
