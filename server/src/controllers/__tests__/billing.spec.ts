import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
}));

const mockPaddleClient = vi.hoisted(() => ({
  subscriptions: {
    cancel: vi.fn(),
    update: vi.fn(),
  },
  customerPortalSessions: {
    create: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase,
}));

vi.mock('@/lib/paddle', () => ({
  paddleClient: mockPaddleClient,
}));

import {
  cancelSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
  getBillingStatus,
  getSubscriptionPlans,
  getUserSubscription,
  resumeSubscription,
} from '@/controllers/billing';

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
    userId: 'user-123',
    ...overrides,
  }) as unknown as Request;

describe('Paddle Billing Controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.PADDLE_BILLING_ENABLED = 'true';
    process.env.PADDLE_API_KEY = 'test-api-key';
    process.env.PADDLE_PRICE_ID_PRO_MONTHLY = 'pri_monthly_123';
    process.env.PADDLE_PRICE_ID_PRO_YEARLY = 'pri_yearly_123';
  });

  describe('getBillingStatus', () => {
    it('returns billing enabled and provider paddle', () => {
      const req = createRequest();
      const res = createMockResponse();

      getBillingStatus(req, res);

      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: {
          enabled: true,
          provider: 'paddle',
        },
      });
    });
  });

  describe('getSubscriptionPlans', () => {
    it('returns available subscription plans', () => {
      const req = createRequest();
      const res = createMockResponse();

      getSubscriptionPlans(req, res);

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.some((p: { id: string }) => p.id === 'pro-monthly')).toBe(true);
      expect(response.data.some((p: { id: string }) => p.id === 'pro-yearly')).toBe(true);
    });
  });

  describe('getUserSubscription', () => {
    it('returns user subscription record in camelcase', async () => {
      const subRow = {
        id: 'sub-1',
        user_id: 'user-123',
        plan: 'pro',
        status: 'active',
        current_period_end: '2026-10-01T00:00:00Z',
      };

      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subRow, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const req = createRequest();
      const res = createMockResponse();

      await getUserSubscription(req, res);

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data).toMatchObject({
        id: 'sub-1',
        userId: 'user-123',
        plan: 'pro',
        status: 'active',
      });
    });
  });

  describe('createCheckoutSession / upgrade', () => {
    it('returns client checkout instruction if user has no existing subscription', async () => {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
      mockSupabase.from.mockReturnValue(chain);

      const req = createRequest({ body: { planId: 'pro' } });
      const res = createMockResponse();

      await createCheckoutSession(req, res);

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.checkoutType).toBe('client');
    });

    it('upgrades subscription when user has active paddle subscription', async () => {
      const subRow = {
        id: 'sub-1',
        user_id: 'user-123',
        paddle_subscription_id: 'sub_paddle_123',
        paddle_customer_id: 'ctm_123',
        status: 'active',
        custom_data: { userId: 'user-123' },
      };

      const queryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
      mockSupabase.from.mockReturnValue(queryChain);

      const updatedSub = {
        id: 'sub_paddle_123',
        customerId: 'ctm_123',
        status: 'active',
        customData: { userId: 'user-123', planId: 'pro-yearly' },
        currentBillingPeriod: { startsAt: '2026-09-01T00:00:00Z', endsAt: '2027-09-01T00:00:00Z' },
      };
      mockPaddleClient.subscriptions.update.mockResolvedValue(updatedSub);

      const req = createRequest({
        body: {
          planId: 'pro-yearly',
          priceId: 'pri_yearly_123',
          upgradeMode: 'immediate',
        },
      });
      const res = createMockResponse();

      await createCheckoutSession(req, res);

      expect(mockPaddleClient.subscriptions.update).toHaveBeenCalledWith(
        'sub_paddle_123',
        expect.objectContaining({
          items: [{ priceId: 'pri_yearly_123', quantity: 1 }],
          prorationBillingMode: 'prorated_immediately',
        })
      );

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.upgraded).toBe(true);
    });
  });

  describe('cancelSubscription', () => {
    it('cancels paddle subscription at next billing period', async () => {
      const subRow = {
        id: 'sub-1',
        user_id: 'user-123',
        paddle_subscription_id: 'sub_paddle_123',
        paddle_customer_id: 'ctm_123',
        status: 'active',
        current_period_end: '2026-10-01T00:00:00Z',
      };

      const queryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
      mockSupabase.from.mockReturnValue(queryChain);

      const updatedSub = {
        id: 'sub_paddle_123',
        customerId: 'ctm_123',
        status: 'active',
        scheduledChange: { action: 'cancel', effectiveAt: '2026-10-01T00:00:00Z' },
        currentBillingPeriod: { endsAt: '2026-10-01T00:00:00Z' },
      };
      mockPaddleClient.subscriptions.cancel.mockResolvedValue(updatedSub);

      const req = createRequest();
      const res = createMockResponse();

      await cancelSubscription(req, res);

      expect(mockPaddleClient.subscriptions.cancel).toHaveBeenCalledWith('sub_paddle_123', {
        effectiveFrom: 'next_billing_period',
      });

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.cancelAtPeriodEnd).toBe(true);
    });
  });

  describe('resumeSubscription', () => {
    it('clears scheduled cancellation on paddle subscription', async () => {
      const subRow = {
        id: 'sub-1',
        user_id: 'user-123',
        paddle_subscription_id: 'sub_paddle_123',
        paddle_customer_id: 'ctm_123',
        status: 'active',
        cancel_at_period_end: true,
      };

      const queryChain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: subRow, error: null }),
        upsert: vi.fn().mockResolvedValue({ error: null }),
        update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      };
      mockSupabase.from.mockReturnValue(queryChain);

      const updatedSub = {
        id: 'sub_paddle_123',
        customerId: 'ctm_123',
        status: 'active',
        scheduledChange: null,
        currentBillingPeriod: { endsAt: '2026-10-01T00:00:00Z' },
      };
      mockPaddleClient.subscriptions.update.mockResolvedValue(updatedSub);

      const req = createRequest();
      const res = createMockResponse();

      await resumeSubscription(req, res);

      expect(mockPaddleClient.subscriptions.update).toHaveBeenCalledWith('sub_paddle_123', {
        scheduledChange: null,
      });

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.cancelAtPeriodEnd).toBe(false);
    });
  });

  describe('createCustomerPortalSession', () => {
    it('creates customer portal session for existing paddle customer', async () => {
      const profileRow = {
        id: 'user-123',
        paddle_customer_id: 'ctm_123',
      };

      const subRow = {
        id: 'sub-1',
        user_id: 'user-123',
        paddle_subscription_id: 'sub_paddle_123',
        paddle_customer_id: 'ctm_123',
      };

      let tableCallCount = 0;
      mockSupabase.from.mockImplementation(() => {
        tableCallCount++;
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: tableCallCount === 1 ? profileRow : subRow,
            error: null,
          }),
        };
      });

      mockPaddleClient.customerPortalSessions.create.mockResolvedValue({
        id: 'cpr_123',
        urls: {
          general: { overview: 'https://paddle.com/portal/overview' },
        },
      });

      const req = createRequest();
      const res = createMockResponse();

      await createCustomerPortalSession(req, res);

      expect(mockPaddleClient.customerPortalSessions.create).toHaveBeenCalledWith('ctm_123', [
        'sub_paddle_123',
      ]);

      const response = (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(response.success).toBe(true);
      expect(response.data.url).toBe('https://paddle.com/portal/overview');
    });
  });
});
