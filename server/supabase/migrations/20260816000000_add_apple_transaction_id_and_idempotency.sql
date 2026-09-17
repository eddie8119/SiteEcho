-- ==========================================================
-- Stage 4: Add Apple Transaction ID and Idempotency Support
-- Purpose: Support database idempotency and account binding
-- ==========================================================

-- 1. Add apple_transaction_id field
ALTER TABLE "UserSubscriptions"
  ADD COLUMN IF NOT EXISTS apple_transaction_id TEXT NULL;

-- 2. Create unique index for apple_transaction_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_apple_transaction_id_unique
  ON "UserSubscriptions" (apple_transaction_id)
  WHERE apple_transaction_id IS NOT NULL;

-- 3. Make apple_original_transaction_id index unique for account binding
DROP INDEX IF EXISTS idx_user_subscriptions_apple_tx_id;
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_subscriptions_apple_original_transaction_id_unique
  ON "UserSubscriptions" (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
