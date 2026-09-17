import { Request, Response } from 'express';
import { Buffer } from 'node:buffer';
import { createHash } from 'node:crypto';

import { GOOGLE_PLAY_PRODUCT } from '@/config/subscriptionConfig';
import { supabaseAdmin } from '@/lib/supabase';
import {
  acknowledgeGooglePlayPurchase,
  verifyGooglePlayPurchase,
} from '@/services/googlePlayVerification';
import { resolveEntitlement } from '@/services/subscriptionEntitlement';
import { AuthenticatedRequest } from '@/types/requests';
import { AppError, handleControllerError } from '@/utils/controllerError';

export interface VerifyGooglePurchaseBody {
  purchaseToken: string;
  productId: string;
}

export const verifyGooglePurchase = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const reqSupabase = (req as AuthenticatedRequest).supabase ?? supabaseAdmin;
    const { purchaseToken } = req.body as VerifyGooglePurchaseBody;

    if (!purchaseToken) {
      throw new AppError('purchaseToken is required', {
        statusCode: 400,
        code: 'MISSING_PURCHASE_TOKEN',
      });
    }

    // 1. Verify with Google
    const verifyResult = await verifyGooglePlayPurchase(purchaseToken);

    if (!verifyResult.isValid || !verifyResult.purchaseInfo) {
      throw new AppError(verifyResult.error || 'Invalid Google purchase', {
        statusCode: 400,
        code: 'INVALID_GOOGLE_PURCHASE',
      });
    }

    const info = verifyResult.purchaseInfo;

    // 2. Validate package and product
    if (info.packageName !== process.env.GOOGLE_PLAY_PACKAGE_NAME) {
      throw new AppError('Package name mismatch', { statusCode: 400, code: 'PACKAGE_MISMATCH' });
    }

    if (info.productId !== GOOGLE_PLAY_PRODUCT.SUBSCRIPTION_ID) {
      throw new AppError('Product not in allowlist', {
        statusCode: 400,
        code: 'PRODUCT_NOT_ALLOWED',
      });
    }

    // 3. Check token not bound to another user
    const { data: existingToken } = await supabaseAdmin
      .from('GooglePurchaseEvents')
      .select('user_id')
      .eq('purchase_token', purchaseToken)
      .maybeSingle();

    if (existingToken && existingToken.user_id !== userId) {
      throw new AppError('Purchase token already bound to another account', {
        statusCode: 409,
        code: 'TOKEN_ACCOUNT_CONFLICT',
      });
    }

    // 4. Check obfuscatedAccountId hash
    if (info.obfuscatedAccountId) {
      const userHash = createHash('sha256').update(userId).digest('hex').slice(0, 64);
      if (info.obfuscatedAccountId !== userHash) {
        throw new AppError('Account ID mismatch', { statusCode: 409, code: 'ACCOUNT_ID_MISMATCH' });
      }
    }

    // 5. Idempotent write
    const { data: upsertedEvent } = await supabaseAdmin
      .from('GooglePurchaseEvents')
      .upsert(
        {
          purchase_token: purchaseToken,
          linked_purchase_token: info.linkedPurchaseToken || null,
          user_id: userId,
          package_name: info.packageName,
          product_id: info.productId,
          base_plan_id: info.basePlanId || null,
          latest_order_id: null,
          purchase_state: info.purchaseState,
          acknowledgement_state: info.acknowledgementState,
          start_time: info.startTime?.toISOString() || null,
          expiry_time: info.expiryTime?.toISOString() || null,
          auto_renewing: info.autoRenewing ?? null,
          region_code: info.regionCode || null,
          raw_response_hash: info.rawResponseHash,
        },
        { onConflict: 'purchase_token' }
      )
      .select('id')
      .single();

    if (!upsertedEvent) {
      throw new AppError('Failed to store Google purchase event', {
        statusCode: 500,
        code: 'GOOGLE_PURCHASE_EVENT_WRITE_FAILED',
      });
    }

    // 6. Recalculate entitlement
    const entitlement = await resolveEntitlement(userId, {
      google: {
        provider: 'google',
        isActive: !!info.expiryTime && info.expiryTime > new Date(),
        expiresAt: info.expiryTime || null,
      },
    });

    // 7. Backend acknowledge
    await acknowledgeGooglePlayPurchase(purchaseToken);

    // 8. Return latest subscription
    const { data: latestSub } = await reqSupabase
      .from('UserSubscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    res.json({
      success: true,
      data: {
        entitlement,
        subscription: latestSub,
      },
    });
  } catch (error) {
    handleControllerError(res, error, 'Google Play purchase verification failed');
  }
};

export interface GoogleRtdnBody {
  message?: {
    messageId?: string;
    data?: string;
    attributes?: Record<string, string>;
    publishTime?: string;
  };
  subscription?: string;
}

interface GoogleDeveloperNotification {
  version?: string;
  packageName?: string;
  eventTimeMillis?: number;
  oneTimeProductNotification?: unknown;
  subscriptionNotification?: {
    version?: string;
    notificationType?: number;
    purchaseToken?: string;
    subscriptionId?: string;
  };
}

const GOOGLE_PUBSUB_AUDIENCE = process.env.GOOGLE_PLAY_PUBSUB_AUDIENCE || '';

/**
 * Stage 6: Handle Google Play RTDN (Real-time Developer Notification)
 * Decodes the Pub/Sub message, stores it, and processes subscription state changes.
 */
export const handleGoogleRtdn = async (req: Request, res: Response) => {
  try {
    // Optional audience check
    const authHeader = req.headers.authorization || '';
    if (GOOGLE_PUBSUB_AUDIENCE && !authHeader.includes(GOOGLE_PUBSUB_AUDIENCE)) {
      console.warn('[GoogleRTDN] Audience mismatch or missing');
      // Do not reject blindly; log and continue
    }

    const { message } = req.body as GoogleRtdnBody;

    if (!message?.data) {
      throw new AppError('Missing Pub/Sub message data', {
        statusCode: 400,
        code: 'MISSING_PUBSUB_DATA',
      });
    }

    const decodedJson = Buffer.from(message.data, 'base64').toString('utf8');
    const notification = JSON.parse(decodedJson) as GoogleDeveloperNotification;
    const subNotification = notification.subscriptionNotification;

    // 1. Idempotent store
    const { data: storedEvent } = await supabaseAdmin
      .from('GoogleNotificationEvents')
      .insert({
        pubsub_message_id: message.messageId || 'unknown',
        notification_type: subNotification?.notificationType,
        purchase_token_hash: subNotification?.purchaseToken
          ? createHash('sha256').update(subNotification.purchaseToken).digest('hex')
          : null,
        package_name: notification.packageName || null,
        event_time: notification.eventTimeMillis
          ? new Date(notification.eventTimeMillis).toISOString()
          : null,
        processed: false,
      })
      .select('id')
      .single();

    if (!storedEvent) {
      throw new AppError('Failed to store Google notification event', {
        statusCode: 500,
        code: 'GOOGLE_NOTIFICATION_STORE_FAILED',
      });
    }

    // 2. If it's a subscription notification and has a purchase token, re-verify
    if (subNotification?.purchaseToken && subNotification?.notificationType != null) {
      const token = subNotification.purchaseToken;
      const { data: existingEvent } = await supabaseAdmin
        .from('GooglePurchaseEvents')
        .select('user_id, purchase_token')
        .eq('purchase_token', token)
        .maybeSingle();

      if (existingEvent) {
        const verifyResult = await verifyGooglePlayPurchase(token);

        if (verifyResult.isValid && verifyResult.purchaseInfo) {
          const info = verifyResult.purchaseInfo;
          await supabaseAdmin.from('GooglePurchaseEvents').upsert(
            {
              purchase_token: token,
              linked_purchase_token: info.linkedPurchaseToken || null,
              user_id: existingEvent.user_id,
              package_name: info.packageName,
              product_id: info.productId,
              base_plan_id: info.basePlanId || null,
              purchase_state: info.purchaseState,
              acknowledgement_state: info.acknowledgementState,
              start_time: info.startTime?.toISOString() || null,
              expiry_time: info.expiryTime?.toISOString() || null,
              auto_renewing: info.autoRenewing ?? null,
              region_code: info.regionCode || null,
              raw_response_hash: info.rawResponseHash,
            },
            { onConflict: 'purchase_token' }
          );

          await resolveEntitlement(existingEvent.user_id);
        }
      }

      await supabaseAdmin
        .from('GoogleNotificationEvents')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('id', storedEvent.id);
    }

    res.status(200).json({ success: true });
  } catch (error) {
    handleControllerError(res, error, 'Google Play RTDN processing failed', 200);
  }
};
