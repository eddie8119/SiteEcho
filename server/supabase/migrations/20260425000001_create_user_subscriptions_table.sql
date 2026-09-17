-- ==========================================================
-- UserSubscriptions Table
-- Purpose: Track user subscription status, plan, and billing information
-- ==========================================================

-- 1. UserSubscriptions Table
CREATE TABLE IF NOT EXISTS "UserSubscriptions" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  
  -- Stripe subscription ID (if applicable)
  stripe_subscription_id TEXT NULL,
  
  -- Plan information
  plan TEXT NOT NULL DEFAULT 'trial',
  status TEXT NOT NULL DEFAULT 'inactive',
  subscription_type TEXT NULL,
  
  -- Trial period
  trial_start TIMESTAMPTZ NULL,
  trial_end_scheduled TIMESTAMPTZ NULL,
  trial_end TIMESTAMPTZ NULL,
  
  -- Billing period
  current_period_start TIMESTAMPTZ NULL,
  current_period_end TIMESTAMPTZ NULL,
  
  -- Cancellation
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT user_subscriptions_stripe_unique UNIQUE (stripe_subscription_id)
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON "UserSubscriptions" (user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON "UserSubscriptions" (status);

-- 2. Row Level Security
ALTER TABLE "UserSubscriptions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UserSubscriptions_select_own" ON "UserSubscriptions";
CREATE POLICY "UserSubscriptions_select_own" ON "UserSubscriptions"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Profiles" 
      WHERE "Profiles".id = user_id 
      AND "Profiles".id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "UserSubscriptions_insert_own" ON "UserSubscriptions";
CREATE POLICY "UserSubscriptions_insert_own" ON "UserSubscriptions"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Profiles" 
      WHERE "Profiles".id = user_id 
      AND "Profiles".id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "UserSubscriptions_update_own" ON "UserSubscriptions";
CREATE POLICY "UserSubscriptions_update_own" ON "UserSubscriptions"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM "Profiles" 
      WHERE "Profiles".id = user_id 
      AND "Profiles".id = auth.uid()
    )
  );

-- 3. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_subscriptions_updated_at ON "UserSubscriptions";
CREATE TRIGGER trg_user_subscriptions_updated_at
  BEFORE UPDATE ON "UserSubscriptions"
  FOR EACH ROW
  EXECUTE FUNCTION set_user_subscriptions_updated_at();
