-- ==========================================================
-- Stage 4: Create Google Notification Events Table
-- Purpose: Track Google Play RTDN notifications for idempotency
-- ==========================================================

-- 1. Create GoogleNotificationEvents table
CREATE TABLE IF NOT EXISTS "GoogleNotificationEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pubsub_message_id TEXT UNIQUE NOT NULL,
  notification_type INTEGER NULL,
  purchase_token_hash TEXT NULL,
  package_name TEXT NULL,
  event_time TIMESTAMPTZ NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Unique index for pubsub_message_id (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_google_notification_events_message_id_unique
  ON "GoogleNotificationEvents" (pubsub_message_id);

-- 3. Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_google_notification_events_processed
  ON "GoogleNotificationEvents" (processed);
CREATE INDEX IF NOT EXISTS idx_google_notification_events_purchase_token_hash
  ON "GoogleNotificationEvents" (purchase_token_hash);
CREATE INDEX IF NOT EXISTS idx_google_notification_events_created_at
  ON "GoogleNotificationEvents" (created_at DESC);

-- 4. Row Level Security - service role only
ALTER TABLE "GoogleNotificationEvents" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "GoogleNotificationEvents_service_only" ON "GoogleNotificationEvents";
CREATE POLICY "GoogleNotificationEvents_service_only" ON "GoogleNotificationEvents"
  FOR ALL
  USING (false);

-- 5. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_google_notification_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_google_notification_events_updated_at ON "GoogleNotificationEvents";
CREATE TRIGGER trg_google_notification_events_updated_at
  BEFORE UPDATE ON "GoogleNotificationEvents"
  FOR EACH ROW
  EXECUTE FUNCTION set_google_notification_events_updated_at();
