-- ==========================================================
-- Add Paddle Billing fields to Profiles, UserSubscriptions, SubscriptionInvoices
-- Purpose: Support Paddle Billing (Paddle v2)
-- ==========================================================

-- 1. Add Paddle fields to Profiles
ALTER TABLE "Profiles"
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_paddle_customer_id
  ON "Profiles" (paddle_customer_id)
  WHERE paddle_customer_id IS NOT NULL;

-- 2. Add Paddle fields to UserSubscriptions
ALTER TABLE "UserSubscriptions"
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT NULL;

-- 3. Update provider check constraint
ALTER TABLE "UserSubscriptions" DROP CONSTRAINT IF EXISTS check_subscription_provider;
ALTER TABLE "UserSubscriptions" ADD CONSTRAINT check_subscription_provider
  CHECK (provider IN ('paddle', 'stripe', 'apple', 'google', 'manual'));

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_paddle_sub_id
  ON "UserSubscriptions" (paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

-- 4. Update SubscriptionInvoices to allow Paddle transactions
ALTER TABLE "SubscriptionInvoices"
  ALTER COLUMN stripe_invoice_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS paddle_transaction_id TEXT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscription_invoices_paddle_tx_id
  ON "SubscriptionInvoices" (paddle_transaction_id)
  WHERE paddle_transaction_id IS NOT NULL;
