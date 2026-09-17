import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  AppleServerNotificationData,
  AppleTransactionInfo,
} from '@/services/appleIapVerification';
import type { Request, Response } from 'express';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));
const mockGetVerificationService = vi.hoisted(() => vi.fn());
const mockVerifyTransactionJws = vi.hoisted(() => vi.fn());
const mockVerifyAndDecodeNotification = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase,
}));
vi.mock('@/services/appleIapVerification', () => ({
  getAppleIapVerificationService: mockGetVerificationService,
}));

import {
  handleAppleWebhook,
  restoreApplePurchases,
  verifyAppleReceipt,
} from '@/controllers/appleBilling';

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (): MockResponse =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as unknown as MockResponse;

const createRequest = (overrides: Partial<Request> = {}) =>
  ({
    body: {},
    headers: {},
    ...overrides,
  }) as Request;

const makeMockTransactionInfo = (
  overrides: Partial<AppleTransactionInfo> = {}
): AppleTransactionInfo => ({
  transactionId: 'tx-1',
  originalTransactionId: 'orig-tx-1',
  productId: 'com.SiteNear.pro.monthly',
  purchaseDate: Date.now(),
  expiresDate: Date.now() + 30 * 24 * 60 * 60 * 1000,
  environment: 'Sandbox',
  bundleId: 'com.SiteNear.fieldalbum',
  subscriptionStatus: 'active',
  ...overrides,
});

const makeMockNotification = (
  overrides: Partial<AppleServerNotificationData> = {}
): AppleServerNotificationData => ({
  notificationType: 'DID_RENEW',
  subtype: undefined,
  notificationUUID: 'uuid-1',
  signedDate: Date.now(),
  environment: 'Sandbox',
  bundleId: 'com.SiteNear.fieldalbum',
  transactionInfo: makeMockTransactionInfo(),
  rawPayload: {},
  ...overrides,
});

const makeThenable = (value: Record<string, unknown>, chain: Record<string, unknown> = {}) => ({
  ...chain,
  then: (resolve: (v: unknown) => unknown) => resolve(value),
});

describe('apple billing controllers', () => {
  let mockMaybeSingle: ReturnType<typeof vi.fn>;
  let mockSingle: ReturnType<typeof vi.fn>;
  let mockInsertSelect: ReturnType<typeof vi.fn>;
  let mockUpdateSelect: ReturnType<typeof vi.fn>;
  let insertEventError: unknown;
  let updateError: unknown;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.APPLE_IAP_VERIFY_ENABLED = 'false';

    mockGetVerificationService.mockReturnValue({
      verifyTransactionJws: mockVerifyTransactionJws,
      verifyAndDecodeNotification: mockVerifyAndDecodeNotification,
    });

    mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    mockSingle = vi.fn().mockResolvedValue({
      data: { id: 'event-1', processed: false, error_message: null },
      error: null,
    });
    mockInsertSelect = vi.fn().mockResolvedValue({ data: null, error: null });
    mockUpdateSelect = vi.fn().mockResolvedValue({ data: null, error: null });
    insertEventError = null;
    updateError = null;

    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: mockMaybeSingle,
          single: mockSingle,
        }),
      }),
      insert: vi.fn().mockImplementation(() =>
        makeThenable(
          { error: insertEventError },
          {
            select: vi.fn().mockReturnValue({
              single: mockInsertSelect,
            }),
          }
        )
      ),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockReturnValue(
          makeThenable(
            { error: updateError },
            {
              select: vi.fn().mockReturnValue({
                single: mockUpdateSelect,
              }),
            }
          )
        ),
      })),
    }));
  });

  describe('verifyAppleReceipt', () => {
    it('blocks receipt verification while the feature flag is disabled', async () => {
      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'some-jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'APPLE_IAP_DISABLED',
          message: 'Apple IAP verification is temporarily disabled.',
        })
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('rejects requests without transactionJws', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';

      const req = createRequest({ userId: 'user-1' });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'MISSING_TRANSACTION_JWS',
        })
      );
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('rejects invalid JWS from verifier', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: false,
        error: 'Verification failed',
      });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'invalid-jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_TRANSACTION',
        })
      );
    });

    it('rejects unsupported product ID', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo({ productId: 'com.SiteNear.pro.unknown' }),
      });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_APPLE_PRODUCT_ID',
        })
      );
    });

    it('authorizes a new purchase', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo(),
      });

      const newSub = {
        id: 'sub-1',
        user_id: 'user-1',
        status: 'active',
        plan: 'paid',
      };
      mockInsertSelect.mockResolvedValue({ data: newSub, error: null });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isPaid: true,
            subscription: newSub,
          }),
        })
      );
    });

    it('idempotency: returns success for duplicate transactionId for same user', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo({ transactionId: 'tx-duplicate' }),
      });

      const existingSub = {
        id: 'sub-existing',
        user_id: 'user-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      mockMaybeSingle
        .mockResolvedValueOnce({ data: { id: 'event-1', user_id: 'user-1' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: existingSub, error: null });
      insertEventError = { code: '23505' };
      mockUpdateSelect.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscription: existingSub,
          }),
        })
      );
    });

    it('does not downgrade from a newer valid subscription', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';

      const later = Date.now() + 365 * 24 * 60 * 60 * 1000;
      const earlier = Date.now() + 30 * 24 * 60 * 60 * 1000;

      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo({ expiresDate: earlier }),
      });

      const existingSub = {
        id: 'sub-existing',
        user_id: 'user-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(later).toISOString(),
      };

      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: existingSub, error: null });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            subscription: existingSub,
          }),
        })
      );
      expect(mockUpdateSelect).not.toHaveBeenCalled();
    });

    it('rejects when originalTransactionId belongs to another user', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo({ originalTransactionId: 'orig-tx-conflict' }),
      });

      mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({
        data: {
          id: 'sub-other',
          user_id: 'user-other',
          apple_original_transaction_id: 'orig-tx-conflict',
        },
        error: null,
      });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'ACCOUNT_CONFLICT',
        })
      );
    });

    it('returns 500 when transaction event insert fails', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo(),
      });
      insertEventError = { message: 'DB write failed' };

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'DB_EVENT_INSERT_FAILED',
        })
      );
    });

    it('returns 500 when subscription update fails', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo(),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      };
      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: existingSub, error: null });
      mockUpdateSelect.mockResolvedValue({ data: null, error: { message: 'update failed' } });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await verifyAppleReceipt(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'SUBSCRIPTION_UPDATE_FAILED',
        })
      );
    });
  });

  describe('restoreApplePurchases', () => {
    it('blocks restore while the feature flag is disabled', async () => {
      const req = createRequest();
      const res = createMockResponse();

      await restoreApplePurchases(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'APPLE_IAP_DISABLED',
        })
      );
    });

    it('updates existing subscription status', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo(),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        status: 'active',
        plan: 'paid',
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await restoreApplePurchases(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            restored: true,
            isPaid: true,
          }),
        })
      );
    });

    it('rejects restore when subscription belongs to another user', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'sub-1', user_id: 'user-other' },
        error: null,
      });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await restoreApplePurchases(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'ACCOUNT_CONFLICT',
        })
      );
    });

    it('re-verifies as purchase when no existing subscription is found', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyTransactionJws.mockResolvedValue({
        isValid: true,
        transactionInfo: makeMockTransactionInfo(),
      });

      const newSub = { id: 'sub-new', user_id: 'user-1', status: 'active', plan: 'paid' };
      mockMaybeSingle
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null });
      mockInsertSelect.mockResolvedValue({ data: newSub, error: null });

      const req = createRequest({
        userId: 'user-1',
        body: { transactionJws: 'jws' },
      });
      const res = createMockResponse();

      await restoreApplePurchases(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            isPaid: true,
            subscription: newSub,
          }),
        })
      );
    });
  });

  describe('handleAppleWebhook', () => {
    it('blocks webhook when the feature flag is disabled', async () => {
      const req = createRequest({
        body: { signedPayload: 'some-payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'APPLE_IAP_DISABLED',
        })
      );
    });

    it('rejects invalid notification', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: false,
        error: 'Invalid signature',
      });

      const req = createRequest({
        body: { signedPayload: 'bad-payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'INVALID_NOTIFICATION_PAYLOAD',
        })
      );
    });

    it('skips already processed notification', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({ notificationUUID: 'uuid-duplicate' }),
      });
      insertEventError = { code: '23505' };
      mockSingle.mockResolvedValue({
        data: { id: 'event-1', processed: true, error_message: null },
        error: null,
      });

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Notification already processed',
        })
      );
    });

    it('processes DID_RENEW and keeps subscription active/paid', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({
          notificationType: 'DID_RENEW',
          notificationUUID: 'uuid-1',
        }),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        apple_original_transaction_id: 'orig-tx-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(Date.now() - 1000).toISOString(),
        cancel_at_period_end: false,
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notificationType: 'DID_RENEW',
          processed: true,
        })
      );
    });

    it('processes EXPIRED and sets subscription inactive/free', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({
          notificationType: 'EXPIRED',
          notificationUUID: 'uuid-2',
          transactionInfo: makeMockTransactionInfo({
            expiresDate: Date.now() - 1000,
            subscriptionStatus: 'expired',
          }),
        }),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        apple_original_transaction_id: 'orig-tx-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notificationType: 'EXPIRED',
          processed: true,
        })
      );
    });

    it('keeps subscription active during GRACE_PERIOD', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      const future = Date.now() + 7 * 24 * 60 * 60 * 1000;
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({
          notificationType: 'DID_FAIL_TO_RENEW',
          subtype: 'GRACE_PERIOD',
          notificationUUID: 'uuid-3',
          transactionInfo: makeMockTransactionInfo({
            expiresDate: future,
            subscriptionStatus: 'active',
          }),
        }),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        apple_original_transaction_id: 'orig-tx-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(future).toISOString(),
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notificationType: 'DID_FAIL_TO_RENEW',
          processed: true,
        })
      );
    });

    it('keeps subscription active when auto-renew is disabled but not expired', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      const future = Date.now() + 30 * 24 * 60 * 60 * 1000;
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({
          notificationType: 'DID_CHANGE_RENEWAL_STATUS',
          subtype: 'AUTO_RENEW_DISABLED',
          notificationUUID: 'uuid-4',
          transactionInfo: makeMockTransactionInfo({
            expiresDate: future,
            subscriptionStatus: 'active',
          }),
        }),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        apple_original_transaction_id: 'orig-tx-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(future).toISOString(),
        cancel_at_period_end: false,
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          notificationType: 'DID_CHANGE_RENEWAL_STATUS',
          processed: true,
        })
      );
    });

    it('returns 500 when subscription update fails and leaves notification unprocessed for retry', async () => {
      process.env.APPLE_IAP_VERIFY_ENABLED = 'true';
      mockVerifyAndDecodeNotification.mockResolvedValue({
        isValid: true,
        notification: makeMockNotification({
          notificationType: 'DID_RENEW',
          notificationUUID: 'uuid-5',
        }),
      });

      const existingSub = {
        id: 'sub-1',
        user_id: 'user-1',
        apple_original_transaction_id: 'orig-tx-1',
        status: 'active',
        plan: 'paid',
        expires_at: new Date(Date.now() - 1000).toISOString(),
      };
      mockMaybeSingle.mockResolvedValue({ data: existingSub, error: null });
      updateError = { message: 'DB write failed' };

      const req = createRequest({
        body: { signedPayload: 'payload' },
      });
      const res = createMockResponse();

      await handleAppleWebhook(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          code: 'SUBSCRIPTION_UPDATE_FAILED',
        })
      );
    });
  });
});
