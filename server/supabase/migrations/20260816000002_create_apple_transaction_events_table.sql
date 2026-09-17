-- ==========================================================
-- Stage 4: Create Apple Transaction Events Table
-- Purpose: Track every verified Apple transaction for idempotency
--          and prevent overwriting newer subscription state.
-- ==========================================================

-- 1. Create AppleTransactionEvents table
CREATE TABLE IF NOT EXISTS "AppleTransactionEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id TEXT NOT NULL,
  original_transaction_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL,
  expires_date TIMESTAMPTZ NOT NULL,
  environment TEXT NOT NULL,
  revocation_date TIMESTAMPTZ NULL,
  jws_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Unique index for transaction_id idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_apple_transaction_events_transaction_id_unique
  ON "AppleTransactionEvents" (transaction_id);

-- 3. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apple_transaction_events_original_tx_id
  ON "AppleTransactionEvents" (original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_apple_transaction_events_user_id
  ON "AppleTransactionEvents" (user_id);
CREATE INDEX IF NOT EXISTS idx_apple_transaction_events_created_at
  ON "AppleTransactionEvents" (created_at DESC);

-- 4. Row Level Security - service role only
ALTER TABLE "AppleTransactionEvents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "AppleTransactionEvents_service_only" ON "AppleTransactionEvents";
CREATE POLICY "AppleTransactionEvents_service_only" ON "AppleTransactionEvents"
  FOR ALL
  USING (false);

-- 5. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_apple_transaction_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apple_transaction_events_updated_at ON "AppleTransactionEvents";
CREATE TRIGGER trg_apple_transaction_events_updated_at
  BEFORE UPDATE ON "AppleTransactionEvents"
  FOR EACH ROW
  EXECUTE FUNCTION set_apple_transaction_events_updated_at();
