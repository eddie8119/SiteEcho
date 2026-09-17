-- ==========================================================
-- Stage 4: Create Google Purchase Events Table
-- Purpose: Track verified Google Play Billing purchases
--          and provide token-level idempotency
-- ==========================================================

-- 1. Create GooglePurchaseEvents table
CREATE TABLE IF NOT EXISTS "GooglePurchaseEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_token TEXT UNIQUE NOT NULL,
  linked_purchase_token TEXT NULL,
  user_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  package_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  base_plan_id TEXT NULL,
  latest_order_id TEXT NULL,
  purchase_state TEXT NOT NULL,
  acknowledgement_state TEXT NOT NULL,
  start_time TIMESTAMPTZ NULL,
  expiry_time TIMESTAMPTZ NULL,
  auto_renewing BOOLEAN NULL,
  region_code TEXT NULL,
  raw_response_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Unique index for purchase_token idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_purchase_events_token_unique
  ON "GooglePurchaseEvents" (purchase_token);

-- 3. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_google_purchase_events_user_id
  ON "GooglePurchaseEvents" (user_id);
CREATE INDEX IF NOT EXISTS idx_google_purchase_events_product_id
  ON "GooglePurchaseEvents" (product_id);
CREATE INDEX IF NOT EXISTS idx_google_purchase_events_expiry_time
  ON "GooglePurchaseEvents" (expiry_time);
CREATE INDEX IF NOT EXISTS idx_google_purchase_events_created_at
  ON "GooglePurchaseEvents" (created_at DESC);

-- 4. Row Level Security - service role only
ALTER TABLE "GooglePurchaseEvents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GooglePurchaseEvents_service_only" ON "GooglePurchaseEvents";
CREATE POLICY "GooglePurchaseEvents_service_only" ON "GooglePurchaseEvents"
  FOR ALL
  USING (false);

-- 5. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_google_purchase_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_purchase_events_updated_at ON "GooglePurchaseEvents";
CREATE TRIGGER trg_google_purchase_events_updated_at
  BEFORE UPDATE ON "GooglePurchaseEvents"
  FOR EACH ROW
  EXECUTE FUNCTION set_google_purchase_events_updated_at();
