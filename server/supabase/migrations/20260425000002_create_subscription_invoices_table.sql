-- ==========================================================
-- SubscriptionInvoices Table
-- Purpose: Track subscription billing invoices from Stripe
-- ==========================================================

-- 1. SubscriptionInvoices Table
CREATE TABLE IF NOT EXISTS "SubscriptionInvoices" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Stripe invoice ID
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  
  -- Link to subscription
  user_subscription_id UUID NOT NULL REFERENCES "UserSubscriptions"(id) ON DELETE CASCADE,
  
  -- Invoice details
  amount BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'usd',
  status TEXT NOT NULL,
  hosted_invoice_url TEXT NULL,
  
  -- Payment timing
  paid_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_invoices_user_subscription_id ON "SubscriptionInvoices" (user_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON "SubscriptionInvoices" (status);

-- 2. Row Level Security
ALTER TABLE "SubscriptionInvoices" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "SubscriptionInvoices_select_own" ON "SubscriptionInvoices";
CREATE POLICY "SubscriptionInvoices_select_own" ON "SubscriptionInvoices"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "UserSubscriptions" us
      JOIN "Profiles" p ON p.id = us.user_id
      WHERE us.id = user_subscription_id 
      AND p.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "SubscriptionInvoices_insert_own" ON "SubscriptionInvoices";
CREATE POLICY "SubscriptionInvoices_insert_own" ON "SubscriptionInvoices"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "UserSubscriptions" us
      JOIN "Profiles" p ON p.id = us.user_id
      WHERE us.id = user_subscription_id 
      AND p.id = auth.uid()
    )
  );
