import { Request, Response } from 'express';
import { createHash } from 'node:crypto';

import { APPLE_IAP_PRODUCT_IDS } from '@/config/subscriptionConfig';
import { supabaseAdmin } from '@/lib/supabase';
import { getAppleIapVerificationService } from '@/services/appleIapVerification';
import { AuthenticatedRequest } from '@/types/requests';
import { AppError, handleControllerError } from '@/utils/controllerError';

export interface VerifyReceiptRequestBody {
  transactionJws: string;
}

const appleIapProductIdAllowlist = new Set<string>(Object.values(APPLE_IAP_PRODUCT_IDS));

const isAppleIapVerificationEnabled = () => process.env.APPLE_IAP_VERIFY_ENABLED === 'true';

const assertAppleIapVerificationEnabled = () => {
  if (!isAppleIapVerificationEnabled()) {
    throw new AppError('Apple IAP verification is temporarily disabled.', {
      statusCode: 503,
      code: 'APPLE_IAP_DISABLED',
    });
  }
};

const ensureUserProfile = async (userId: string): Promise<void> => {
  const { data: existingProfile } = await supabaseAdmin
    .from('Profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle();

  if (existingProfile) return;

  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userError || !userData?.user) {
    throw new AppError('Authenticated user not found in auth system', {
      statusCode: 404,
      code: 'USER_NOT_FOUND',
      detail: userError?.message,
      exposeError: true,
    });
  }

  const email = userData.user.email || `${userId}@placeholder.local`;
  const { error: profileError } = await supabaseAdmin.from('Profiles').insert({
    id: userId,
    email,
    is_paid: false,
  });

  if (profileError && profileError.code !== '23505') {
    console.error('[AppleIAP] Failed to create user profile during verification:', profileError);
    throw new AppError('Failed to create user profile', {
      statusCode: 500,
      code: 'PROFILE_CREATION_FAILED',
      detail: profileError.message,
      exposeError: true,
    });
  }
};

/**
 * Verify and process Apple StoreKit 2 transaction/receipt
 */
export const verifyAppleReceipt = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    console.log('[verifyAppleReceipt] received request', { userId, body: req.body });

    assertAppleIapVerificationEnabled();

    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    await ensureUserProfile(userId);

    const reqSupabase = (req as AuthenticatedRequest).supabase ?? supabaseAdmin;
    const { transactionJws } = req.body as VerifyReceiptRequestBody;

    // Stage 0: Reject requests without transactionJws
    if (!transactionJws) {
      throw new AppError('transactionJws is required for Apple IAP verification', {
        statusCode: 400,
        code: 'MISSING_TRANSACTION_JWS',
      });
    }

    // Use the official verification service
    const verificationService = getAppleIapVerificationService();
    const verificationResult = await verificationService.verifyTransactionJws(transactionJws);

    if (!verificationResult.isValid) {
      const isProductIdError = verificationResult.error?.includes('Product ID not in allowlist');
      throw new AppError(verificationResult.error || 'Invalid Apple transaction', {
        statusCode: 400,
        code: isProductIdError ? 'INVALID_APPLE_PRODUCT_ID' : 'INVALID_TRANSACTION',
      });
    }

    // Stage 0: Require transactionInfo from JWS verification, no fallback to request body
    if (!verificationResult.transactionInfo) {
      throw new AppError('Transaction verification failed: no transaction info in JWS', {
        statusCode: 400,
        code: 'INVALID_TRANSACTION_JWS',
      });
    }

    const transactionInfo = verificationResult.transactionInfo;
    const transactionId = transactionInfo.transactionId;
    const originalTransactionId = transactionInfo.originalTransactionId;
    const productId = transactionInfo.productId;
    const purchaseDateMs = transactionInfo.purchaseDate;
    const expiresDateMs = transactionInfo.expiresDate;
    const environment = transactionInfo.environment;

    if (!appleIapProductIdAllowlist.has(productId)) {
      throw new AppError('Unsupported Apple product ID', {
        statusCode: 400,
        code: 'INVALID_APPLE_PRODUCT_ID',
      });
    }

    // Stage 4: Idempotency - check if this exact transaction was already processed
    const { data: existingEvent } = await supabaseAdmin
      .from('AppleTransactionEvents')
      .select('id, user_id')
      .eq('transaction_id', transactionId)
      .maybeSingle();

    if (existingEvent && existingEvent.user_id !== userId) {
      throw new AppError(
        'This purchase is already linked to another account. Please use the original account that made the purchase.',
        {
          statusCode: 409,
          code: 'ACCOUNT_CONFLICT',
        }
      );
    }

    // Stage 4: Account binding - original transaction cannot belong to another user
    const { data: existingOriginal } = await supabaseAdmin
      .from('UserSubscriptions')
      .select('id, user_id, expires_at')
      .eq('apple_original_transaction_id', originalTransactionId)
      .maybeSingle();

    if (existingOriginal && existingOriginal.user_id !== userId) {
      throw new AppError(
        'This subscription is already linked to another account. Please use the original account that made the purchase.',
        {
          statusCode: 409,
          code: 'ACCOUNT_CONFLICT',
        }
      );
    }

    const jwsHash = createHash('sha256').update(transactionJws).digest('hex');

    // Stage 4: Record transaction event first
    const { error: eventInsertError } = await supabaseAdmin.from('AppleTransactionEvents').insert({
      transaction_id: transactionId,
      original_transaction_id: originalTransactionId,
      user_id: userId,
      product_id: productId,
      purchase_date: new Date(purchaseDateMs).toISOString(),
      expires_date: new Date(expiresDateMs).toISOString(),
      environment,
      jws_hash: jwsHash,
    });

    if (eventInsertError && eventInsertError.code !== '23505') {
      console.error('[AppleIAP] Failed to insert AppleTransactionEvents:', eventInsertError);
      throw new AppError('Failed to record transaction event', {
        statusCode: 500,
        code: 'DB_EVENT_INSERT_FAILED',
        detail: eventInsertError.message,
        exposeError: true,
      });
    }

    // Stage 4: Only update UserSubscriptions if this is the latest transaction for the user
    const { data: existingSub } = await reqSupabase
      .from('UserSubscriptions')
      .select('id, user_id, expires_at')
      .eq('user_id', userId)
      .maybeSingle();

    const currentExpiresMs = existingSub?.expires_at
      ? new Date(existingSub.expires_at).getTime()
      : 0;
    const isNewerOrNoSub = !existingSub || expiresDateMs >= currentExpiresMs;

    const currentPeriodStart = new Date(purchaseDateMs).toISOString();
    const currentPeriodEnd = new Date(expiresDateMs).toISOString();
    const isActive = expiresDateMs > Date.now();

    let subscription = existingSub;

    if (isNewerOrNoSub) {
      const subscriptionPayload = {
        user_id: userId,
        provider: 'apple',
        apple_transaction_id: transactionId,
        apple_original_transaction_id: originalTransactionId,
        apple_product_id: productId,
        plan: isActive ? 'paid' : 'free',
        status: isActive ? 'active' : 'inactive',
        environment,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        expires_at: currentPeriodEnd,
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
      };

      if (existingSub) {
        const { data, error } = await reqSupabase
          .from('UserSubscriptions')
          .update(subscriptionPayload)
          .eq('id', existingSub.id)
          .select()
          .single();

        if (error) {
          console.error('[AppleIAP] Failed to update UserSubscriptions:', error);
          throw new AppError('Failed to update subscription', {
            statusCode: 500,
            code: 'SUBSCRIPTION_UPDATE_FAILED',
            detail: error.message,
            exposeError: true,
          });
        }
        subscription = data;
      } else {
        const { data, error } = await reqSupabase
          .from('UserSubscriptions')
          .insert(subscriptionPayload)
          .select()
          .single();

        if (error) {
          console.error('[AppleIAP] Failed to insert UserSubscriptions:', error);
          throw new AppError('Failed to create subscription', {
            statusCode: 500,
            code: 'SUBSCRIPTION_INSERT_FAILED',
            detail: error.message,
            exposeError: true,
          });
        }
        subscription = data;
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        subscription,
        isPaid: expiresDateMs > Date.now(),
        transactionId,
        originalTransactionId,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Verify Apple receipt error');
  }
};

/**
 * Restore Apple Purchases
 */
export const restoreApplePurchases = async (req: Request, res: Response) => {
  try {
    assertAppleIapVerificationEnabled();

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { transactionJws } = req.body;

    // Stage 2: Require transactionJws instead of originalTransactionId
    if (!transactionJws) {
      throw new AppError('transactionJws is required for Apple restore', {
        statusCode: 400,
        code: 'MISSING_TRANSACTION_JWS',
      });
    }

    // Use the new verification service
    const verificationService = getAppleIapVerificationService();
    const verificationResult = await verificationService.verifyTransactionJws(transactionJws);

    if (!verificationResult.isValid || !verificationResult.transactionInfo) {
      throw new AppError(verificationResult.error || 'Invalid Apple restore transaction JWS', {
        statusCode: 400,
        code: 'INVALID_TRANSACTION_JWS',
      });
    }

    const transactionInfo = verificationResult.transactionInfo;
    const originalTransactionId = transactionInfo.originalTransactionId;
    const productId = transactionInfo.productId;

    if (!appleIapProductIdAllowlist.has(productId)) {
      throw new AppError('Unsupported Apple product ID', {
        statusCode: 400,
        code: 'INVALID_APPLE_PRODUCT_ID',
      });
    }

    // Find subscription by original transaction ID
    const { data: existingSub, error: findError } = await supabaseAdmin
      .from('UserSubscriptions')
      .select('*')
      .eq('apple_original_transaction_id', originalTransactionId)
      .maybeSingle();

    if (findError) {
      throw new AppError('Database query failed during restore', {
        statusCode: 500,
        code: 'RESTORE_QUERY_FAILED',
      });
    }

    if (!existingSub) {
      // Re-verify receipt as new purchase if not found in database yet
      return verifyAppleReceipt(req, res);
    }

    // Stage 4: Check account binding - prevent silent transfer
    if (existingSub.user_id !== userId) {
      throw new AppError(
        'This subscription is already linked to another account. Please use the original account that made the purchase.',
        {
          statusCode: 409,
          code: 'ACCOUNT_CONFLICT',
        }
      );
    }

    // Update subscription status for current user
    const isStillActive = transactionInfo.subscriptionStatus === 'active';

    await supabaseAdmin
      .from('UserSubscriptions')
      .update({
        status: isStillActive ? 'active' : 'inactive',
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);

    return res.status(200).json({
      success: true,
      data: {
        restored: true,
        isPaid: isStillActive,
        subscription: existingSub,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Restore Apple purchases error');
  }
};

/**
 * Handle App Store Server Notifications V2 Webhook
 */
export const handleAppleWebhook = async (req: Request, res: Response) => {
  try {
    assertAppleIapVerificationEnabled();

    const { signedPayload } = req.body;

    if (!signedPayload) {
      throw new AppError('signedPayload is required', {
        statusCode: 400,
        code: 'MISSING_SIGNED_PAYLOAD',
      });
    }

    const verificationService = getAppleIapVerificationService();
    const verificationResult = await verificationService.verifyAndDecodeNotification(signedPayload);

    if (!verificationResult.isValid || !verificationResult.notification) {
      console.error('[AppleWebhook] Notification verification failed:', verificationResult.error);
      throw new AppError(verificationResult.error || 'Invalid Apple notification payload', {
        statusCode: 400,
        code: 'INVALID_NOTIFICATION_PAYLOAD',
      });
    }

    const { notificationType, subtype, notificationUUID, signedDate, transactionInfo } =
      verificationResult.notification;

    if (!notificationUUID) {
      throw new AppError('Missing notificationUUID', {
        statusCode: 400,
        code: 'MISSING_NOTIFICATION_UUID',
      });
    }

    console.info(
      `[AppleWebhook] Processing notification: ${notificationType} (subtype: ${subtype || 'none'}, UUID: ${notificationUUID})`
    );

    // Handle Apple TEST notification
    if (notificationType === 'TEST') {
      return res.status(200).json({
        success: true,
        message: 'Test notification received successfully',
      });
    }

    // Stage 5: Atomically insert notification event first, then process
    const { error: insertError } = await supabaseAdmin.from('AppleNotificationEvents').insert({
      notification_uuid: notificationUUID,
      notification_type: notificationType,
      subtype,
      signed_date: new Date(signedDate).toISOString(),
      environment: verificationResult.notification.environment ?? null,
      processed: false,
    });

    if (insertError && insertError.code !== '23505') {
      console.error('[AppleWebhook] Failed to create notification event:', insertError);
      throw new AppError('Failed to create notification event', {
        statusCode: 500,
        code: 'NOTIFICATION_INSERT_FAILED',
      });
    }

    // Stage 5: Check if the notification was already successfully processed
    const { data: existingNotification, error: checkError } = await supabaseAdmin
      .from('AppleNotificationEvents')
      .select('id, processed, error_message')
      .eq('notification_uuid', notificationUUID)
      .single();

    if (checkError) {
      console.error('[AppleWebhook] Failed to check notification state:', checkError);
      throw new AppError('Failed to check notification state', {
        statusCode: 500,
        code: 'NOTIFICATION_CHECK_FAILED',
      });
    }

    if (existingNotification.processed && !existingNotification.error_message) {
      console.info(
        `[AppleWebhook] Notification ${notificationUUID} already processed successfully`
      );
      return res.status(200).json({
        success: true,
        message: 'Notification already processed',
      });
    }

    if (!transactionInfo || !transactionInfo.originalTransactionId) {
      console.warn('[AppleWebhook] No originalTransactionId in notification, acknowledging');
      await supabaseAdmin
        .from('AppleNotificationEvents')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('notification_uuid', notificationUUID);
      return res.status(200).json({
        success: true,
        message: 'Notification acknowledged (no originalTransactionId found)',
      });
    }

    const originalTxId = transactionInfo.originalTransactionId;
    const expiresDateMs = transactionInfo.expiresDate;

    // Find existing subscription by original transaction ID
    const { data: existingSub, error: findError } = await supabaseAdmin
      .from('UserSubscriptions')
      .select(
        'id, user_id, status, plan, expires_at, cancel_at_period_end, apple_product_id, apple_transaction_id'
      )
      .eq('apple_original_transaction_id', originalTxId)
      .maybeSingle();

    if (findError) {
      console.error('[AppleWebhook] Database query error:', findError);
      throw new AppError('Failed to query subscription', {
        statusCode: 500,
        code: 'DB_QUERY_ERROR',
      });
    }

    if (!existingSub) {
      console.info(
        `[AppleWebhook] No existing subscription found for originalTxId ${originalTxId}. Acknowledging notification.`
      );
      await supabaseAdmin
        .from('AppleNotificationEvents')
        .update({ processed: true, processed_at: new Date().toISOString() })
        .eq('notification_uuid', notificationUUID);
      return res.status(200).json({
        success: true,
        message: 'No subscription found for this transaction ID',
      });
    }

    // Compute next state
    let nextStatus: 'active' | 'inactive' = existingSub.status as 'active' | 'inactive';
    let nextPlan: 'paid' | 'free' = existingSub.plan as 'paid' | 'free';
    let nextProductId = existingSub.apple_product_id;
    let nextTransactionId = existingSub.apple_transaction_id;
    let nextExpiresAt = existingSub.expires_at
      ? new Date(existingSub.expires_at).toISOString()
      : new Date(expiresDateMs).toISOString();
    let nextCancelAtPeriodEnd = existingSub.cancel_at_period_end ?? false;
    const now = Date.now();
    const isExpired = expiresDateMs > 0 && expiresDateMs < now;

    switch (notificationType) {
      case 'SUBSCRIBED':
      case 'DID_RENEW':
      case 'OFFER_REDEEMED':
      case 'RENEWAL_EXTENDED':
        nextStatus = 'active';
        nextPlan = 'paid';
        nextExpiresAt = new Date(expiresDateMs).toISOString();
        nextProductId = transactionInfo.productId;
        nextTransactionId = transactionInfo.transactionId;
        break;

      case 'EXPIRED':
      case 'REFUND':
      case 'REVOKE':
      case 'GRACE_PERIOD_EXPIRED':
        nextStatus = 'inactive';
        nextPlan = 'free';
        break;

      case 'DID_FAIL_TO_RENEW':
        if (subtype === 'GRACE_PERIOD') {
          nextStatus = 'active';
          nextPlan = 'paid';
          if (expiresDateMs > 0) nextExpiresAt = new Date(expiresDateMs).toISOString();
        } else if (isExpired) {
          nextStatus = 'inactive';
          nextPlan = 'free';
        }
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        // Auto-renew disabled/enabled; current entitlement remains valid until expiration
        if (subtype === 'AUTO_RENEW_DISABLED') {
          nextCancelAtPeriodEnd = true;
        } else if (subtype === 'AUTO_RENEW_ENABLED') {
          nextCancelAtPeriodEnd = false;
        }
        if (!isExpired) {
          nextStatus = 'active';
          nextPlan = 'paid';
        }
        if (expiresDateMs > 0) nextExpiresAt = new Date(expiresDateMs).toISOString();
        break;

      case 'PRICE_INCREASE':
        console.info(
          `[AppleWebhook] Price increase notification for subscription ${existingSub.id}`
        );
        break;

      default:
        console.info(
          `[AppleWebhook] Unhandled notificationType ${notificationType}, keeping current status.`
        );
        break;
    }

    // Stage 5: Do not downgrade from a newer known state unless the notification explicitly revokes
    const currentExpiresMs = existingSub.expires_at
      ? new Date(existingSub.expires_at).getTime()
      : 0;
    const isRevocation = ['REFUND', 'REVOKE', 'GRACE_PERIOD_EXPIRED'].includes(notificationType);
    if (currentExpiresMs > 0 && currentExpiresMs > expiresDateMs && !isRevocation) {
      nextExpiresAt = new Date(currentExpiresMs).toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('UserSubscriptions')
      .update({
        status: nextStatus,
        plan: nextPlan,
        apple_product_id: nextProductId,
        apple_transaction_id: nextTransactionId,
        expires_at: nextExpiresAt,
        cancel_at_period_end: nextCancelAtPeriodEnd,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingSub.id);

    if (updateError) {
      console.error('[AppleWebhook] Failed to update UserSubscriptions:', updateError);
      // Stage 5: Keep processed=false so Apple can retry
      await supabaseAdmin
        .from('AppleNotificationEvents')
        .update({ error_message: updateError.message })
        .eq('notification_uuid', notificationUUID);
      throw new AppError('Failed to update subscription status', {
        statusCode: 500,
        code: 'SUBSCRIPTION_UPDATE_FAILED',
      });
    }

    await supabaseAdmin
      .from('AppleNotificationEvents')
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
        error_message: null,
      })
      .eq('notification_uuid', notificationUUID);

    console.info(
      `[AppleWebhook] Successfully updated subscription ${existingSub.id} for originalTxId ${originalTxId} to status=${nextStatus}, plan=${nextPlan}`
    );

    return res.status(200).json({
      success: true,
      notificationType,
      processed: true,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Apple Webhook error');
  }
};
