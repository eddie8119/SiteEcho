-- ==========================================================
-- Add Apple IAP fields to UserSubscriptions Table
-- Purpose: Support Apple In-App Purchases (StoreKit 2)
-- ==========================================================

-- 1. Add Apple IAP & Provider columns
ALTER TABLE "UserSubscriptions" 
  ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS apple_product_id TEXT NULL,
  ADD COLUMN IF NOT EXISTS environment TEXT NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL;

-- 2. Add constraint for provider types
ALTER TABLE "UserSubscriptions" DROP CONSTRAINT IF EXISTS check_subscription_provider;
ALTER TABLE "UserSubscriptions" ADD CONSTRAINT check_subscription_provider
  CHECK (provider IN ('stripe', 'apple', 'manual'));

-- 3. Create index for Apple Transaction lookup
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_apple_tx_id 
  ON "UserSubscriptions" (apple_original_transaction_id) 
  WHERE apple_original_transaction_id IS NOT NULL;
