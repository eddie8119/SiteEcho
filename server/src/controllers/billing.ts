import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';
import { Buffer } from 'node:buffer';

import type { EventEntity, Subscription, Transaction } from '@paddle/paddle-node-sdk';

import { PADDLE_PRICE_IDS, SUBSCRIPTION_PLANS } from '@/config/subscriptionConfig';
import { paddleClient } from '@/lib/paddle';
import { supabaseAdmin } from '@/lib/supabase';
import { AuthenticatedRequest } from '@/types/requests';
import { AppError, handleControllerError } from '@/utils/controllerError';

type RequestWithRawBody = Request & { rawBody?: Buffer };

const billingEnabled =
  process.env.PADDLE_BILLING_ENABLED === 'true' || Boolean(process.env.PADDLE_API_KEY);

const paddleWebhookSecret = process.env.PADDLE_WEBHOOK_SECRET;
const appBaseUrl = process.env.CLIENT_URL ?? 'http://localhost:5173';

const assertBillingEnabled = () => {
  if (!billingEnabled || !paddleClient) {
    throw new AppError('Paddle billing is currently disabled for this environment.', {
      statusCode: 503,
      code: 'BILLING_DISABLED',
    });
  }
};

const mapPaddleSubscriptionStatus = (
  status: string
): 'active' | 'inactive' | 'cancelled' | 'past_due' => {
  switch (status) {
    case 'active':
    case 'trialing':
      return 'active';
    case 'canceled':
      return 'cancelled';
    case 'past_due':
      return 'past_due';
    case 'paused':
      return 'inactive';
    default:
      return 'inactive';
  }
};

const getLatestUserSubscription = async (userId: string) => {
  const { data, error } = await supabaseAdmin
    .from('UserSubscriptions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new AppError('Failed to load subscription information', {
      statusCode: 500,
      code: 'SUBSCRIPTION_FETCH_FAILED',
      detail: error.message,
      exposeError: true,
    });
  }

  return data;
};

export const getBillingStatus = (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: {
      enabled: billingEnabled && Boolean(paddleClient),
      provider: 'paddle',
    },
  });
};

export const getSubscriptionPlans = (_req: Request, res: Response) => {
  return res.json({
    success: true,
    data: SUBSCRIPTION_PLANS,
  });
};

export const getUserSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const subscription = await getLatestUserSubscription(userId);
    const camelcaseSubscription = subscription ? camelcaseKeys(subscription, { deep: true }) : null;

    return res.json({
      success: true,
      data: camelcaseSubscription,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get user subscription error');
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    assertBillingEnabled();

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const subscription = await getLatestUserSubscription(userId);

    if (!subscription) {
      throw new AppError('No active subscription to cancel', {
        statusCode: 404,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    }

    // Handle Paddle subscription
    if (subscription.paddle_subscription_id && paddleClient) {
      const updatedPaddleSub = await paddleClient.subscriptions.cancel(
        subscription.paddle_subscription_id,
        {
          effectiveFrom: 'next_billing_period',
        }
      );

      await upsertPaddleSubscriptionRecord(updatedPaddleSub);

      const periodEnd =
        updatedPaddleSub.currentBillingPeriod?.endsAt ??
        updatedPaddleSub.nextBilledAt ??
        subscription.current_period_end;

      return res.json({
        success: true,
        data: camelcaseKeys(
          {
            cancel_at_period_end: true,
            current_period_end: periodEnd,
          },
          { deep: false }
        ),
      });
    }

    throw new AppError('No active Paddle subscription to cancel', {
      statusCode: 400,
      code: 'SUBSCRIPTION_PROVIDER_ERROR',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Cancel subscription error');
  }
};

export const resumeSubscription = async (req: Request, res: Response) => {
  try {
    assertBillingEnabled();

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const subscription = await getLatestUserSubscription(userId);

    if (!subscription) {
      throw new AppError('No active subscription to resume', {
        statusCode: 404,
        code: 'SUBSCRIPTION_NOT_FOUND',
      });
    }

    // Handle Paddle subscription
    if (subscription.paddle_subscription_id && paddleClient) {
      const updatedPaddleSub = await paddleClient.subscriptions.update(
        subscription.paddle_subscription_id,
        {
          scheduledChange: null,
        }
      );

      await upsertPaddleSubscriptionRecord(updatedPaddleSub);

      const periodEnd =
        updatedPaddleSub.currentBillingPeriod?.endsAt ??
        updatedPaddleSub.nextBilledAt ??
        subscription.current_period_end;

      return res.json({
        success: true,
        data: camelcaseKeys(
          {
            cancel_at_period_end: false,
            current_period_end: periodEnd,
          },
          { deep: false }
        ),
      });
    }

    throw new AppError('No active Paddle subscription to resume', {
      statusCode: 400,
      code: 'SUBSCRIPTION_PROVIDER_ERROR',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Resume subscription error');
  }
};

export const createCustomerPortalSession = async (req: Request, res: Response) => {
  try {
    assertBillingEnabled();

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { data: profile } = await supabaseAdmin
      .from('Profiles')
      .select('id, email, paddle_customer_id')
      .eq('id', userId)
      .maybeSingle();

    const subscription = await getLatestUserSubscription(userId);

    // Paddle Customer Portal Session
    if (paddleClient && (profile?.paddle_customer_id || subscription?.paddle_customer_id)) {
      const customerId = (profile?.paddle_customer_id ||
        subscription?.paddle_customer_id) as string;
      const subscriptionIds = subscription?.paddle_subscription_id
        ? [subscription.paddle_subscription_id]
        : [];

      const portalSession = await paddleClient.customerPortalSessions.create(
        customerId,
        subscriptionIds
      );

      const portalUrls = portalSession.urls as unknown as {
        general?: { overview?: string };
      };
      const portalUrl = portalUrls.general?.overview ?? `${appBaseUrl}/setting/subscription`;

      return res.json({
        success: true,
        data: {
          url: portalUrl,
        },
      });
    }

    throw new AppError('No active customer billing portal found', {
      statusCode: 404,
      code: 'PORTAL_NOT_AVAILABLE',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Create customer portal session error');
  }
};

export const createCheckoutSession = async (req: Request, res: Response) => {
  try {
    assertBillingEnabled();

    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { planId, priceId, upgradeMode } = req.body as {
      planId?: string;
      priceId?: string;
      upgradeMode?: 'immediate' | 'next_renewal';
    };

    const subscription = await getLatestUserSubscription(userId);

    // If user has an active Paddle subscription and requests an upgrade/plan change
    if (subscription?.paddle_subscription_id && paddleClient && (priceId || planId)) {
      const targetPriceId =
        priceId ||
        (planId === 'pro-yearly' || planId === 'yearly'
          ? PADDLE_PRICE_IDS.YEARLY
          : PADDLE_PRICE_IDS.MONTHLY);

      if (!targetPriceId) {
        throw new AppError('Target price ID is not configured for plan change', {
          statusCode: 400,
          code: 'INVALID_PLAN_PRICE',
        });
      }

      const prorationBillingMode =
        upgradeMode === 'next_renewal' ? 'prorated_next_billing_period' : 'prorated_immediately';

      const updatedPaddleSub = await paddleClient.subscriptions.update(
        subscription.paddle_subscription_id,
        {
          items: [{ priceId: targetPriceId, quantity: 1 }],
          prorationBillingMode: prorationBillingMode as unknown as undefined,
          customData: {
            ...((subscription.custom_data as Record<string, unknown>) || {}),
            planId: planId || 'pro',
            userId,
          },
        }
      );

      await upsertPaddleSubscriptionRecord(updatedPaddleSub);

      return res.json({
        success: true,
        data: {
          upgraded: true,
          message: 'Subscription plan updated successfully',
        },
      });
    }

    return res.json({
      success: true,
      message: 'For Paddle billing, please use the frontend Paddle.js checkout.',
      data: {
        checkoutType: 'client',
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Create checkout session error');
  }
};

// ==========================================
// Paddle DB Helper Functions
// ==========================================

export const upsertPaddleSubscriptionRecord = async (paddleSub: Subscription) => {
  if (!paddleSub || !paddleSub.id) return;

  const customerId = paddleSub.customerId;
  const customData = (paddleSub.customData as Record<string, unknown> | null) || {};
  const userId = (customData.userId || customData.user_id) as string | undefined;

  let targetUserId = userId;

  if (!targetUserId && customerId) {
    const { data: profile } = await supabaseAdmin
      .from('Profiles')
      .select('id')
      .eq('paddle_customer_id', customerId)
      .maybeSingle();

    if (profile) {
      targetUserId = profile.id;
    }
  }

  if (!targetUserId) {
    const { data: existingSub } = await supabaseAdmin
      .from('UserSubscriptions')
      .select('user_id')
      .eq('paddle_subscription_id', paddleSub.id)
      .maybeSingle();

    if (existingSub) {
      targetUserId = existingSub.user_id;
    }
  }

  if (!targetUserId) {
    console.warn('[Paddle] Unable to resolve user_id for subscription', paddleSub.id);
    return;
  }

  if (customerId) {
    await supabaseAdmin
      .from('Profiles')
      .update({ paddle_customer_id: customerId })
      .eq('id', targetUserId);
  }

  const currentPeriodStart = paddleSub.currentBillingPeriod?.startsAt ?? null;
  const currentPeriodEnd = paddleSub.currentBillingPeriod?.endsAt ?? paddleSub.nextBilledAt ?? null;
  const isCanceled =
    paddleSub.status === 'canceled' || Boolean(paddleSub.scheduledChange?.action === 'cancel');

  const status = mapPaddleSubscriptionStatus(paddleSub.status);
  const plan = (customData.planId || customData.plan || 'pro') as string;

  const payload = {
    user_id: targetUserId,
    provider: 'paddle',
    paddle_subscription_id: paddleSub.id,
    paddle_customer_id: customerId ?? null,
    plan,
    status,
    current_period_start: currentPeriodStart,
    current_period_end: currentPeriodEnd,
    expires_at: currentPeriodEnd,
    cancel_at_period_end: isCanceled,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('UserSubscriptions')
    .upsert(payload, { onConflict: 'paddle_subscription_id' });

  if (error) {
    console.error('[Paddle] Failed to upsert subscription', error);
  }

  if (status === 'active') {
    await supabaseAdmin.from('Profiles').update({ is_paid: true }).eq('id', targetUserId);
  } else if (status === 'cancelled' || status === 'inactive') {
    await supabaseAdmin.from('Profiles').update({ is_paid: false }).eq('id', targetUserId);
  }
};

export const upsertPaddleTransactionRecord = async (transaction: Transaction) => {
  if (!transaction || !transaction.id) return;

  const subscriptionId = transaction.subscriptionId;
  const customerId = transaction.customerId;

  let subscriptionRow: { id: string; user_id: string } | null = null;

  if (subscriptionId) {
    const { data } = await supabaseAdmin
      .from('UserSubscriptions')
      .select('id, user_id')
      .eq('paddle_subscription_id', subscriptionId)
      .maybeSingle();

    subscriptionRow = data;
  }

  if (!subscriptionRow && customerId) {
    const { data: profile } = await supabaseAdmin
      .from('Profiles')
      .select('id')
      .eq('paddle_customer_id', customerId)
      .maybeSingle();

    if (profile) {
      const { data: sub } = await supabaseAdmin
        .from('UserSubscriptions')
        .select('id, user_id')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      subscriptionRow = sub;
    }
  }

  if (!subscriptionRow) {
    console.warn('[Paddle] Cannot find subscription row for transaction', transaction.id);
    return;
  }

  const amount = transaction.details?.totals?.total
    ? Number.parseInt(transaction.details.totals.total, 10)
    : 0;
  const currency = transaction.currencyCode?.toLowerCase() ?? 'usd';
  const status = transaction.status ?? 'paid';
  const invoiceUrl =
    (transaction as unknown as { invoicePdfUrl?: string; checkout?: { url?: string } })
      .invoicePdfUrl ??
    (transaction as unknown as { invoicePdfUrl?: string; checkout?: { url?: string } }).checkout
      ?.url ??
    null;
  const paidAt = transaction.billedAt ?? new Date().toISOString();

  const payload = {
    paddle_transaction_id: transaction.id,
    user_subscription_id: subscriptionRow.id,
    amount,
    currency,
    status,
    hosted_invoice_url: invoiceUrl,
    paid_at: paidAt,
    created_at: transaction.createdAt ?? new Date().toISOString(),
  };

  const { error } = await supabaseAdmin
    .from('SubscriptionInvoices')
    .upsert(payload, { onConflict: 'paddle_transaction_id' });

  if (error) {
    console.error('[Paddle] Failed to upsert invoice transaction', error);
  }
};

export const handlePaddleWebhook = async (req: RequestWithRawBody, res: Response) => {
  try {
    assertBillingEnabled();

    if (!paddleClient || !paddleWebhookSecret) {
      throw new AppError('Paddle webhook secret is not configured', {
        statusCode: 500,
        code: 'WEBHOOK_SECRET_MISSING',
      });
    }

    const signature = (req.headers['paddle-signature'] as string) || '';
    if (!signature) {
      throw new AppError('Missing paddle-signature header', {
        statusCode: 400,
        code: 'PADDLE_SIGNATURE_MISSING',
      });
    }

    const rawBodyString = req.rawBody ? req.rawBody.toString('utf-8') : JSON.stringify(req.body);

    let event: EventEntity;
    try {
      event = await paddleClient.webhooks.unmarshal(rawBodyString, paddleWebhookSecret, signature);
    } catch (err: unknown) {
      console.error('[Paddle] Webhook signature verification failed', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      return res
        .status(400)
        .json({ success: false, message: `Paddle Webhook Error: ${errorMessage}` });
    }

    const eventType = event.eventType;
    const data = event.data;

    console.info(`[Paddle Webhook] Received event: ${eventType}`);

    switch (eventType) {
      case 'subscription.created':
      case 'subscription.updated':
      case 'subscription.activated':
      case 'subscription.canceled':
      case 'subscription.past_due':
      case 'subscription.paused':
      case 'subscription.resumed': {
        await upsertPaddleSubscriptionRecord(data as Subscription);
        break;
      }
      case 'transaction.completed':
      case 'transaction.paid': {
        await upsertPaddleTransactionRecord(data as Transaction);
        break;
      }
      default:
        break;
    }

    return res.json({ received: true });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Paddle webhook handler error');
  }
};
