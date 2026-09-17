-- ==========================================================
-- Stage 5: Create Apple Notification Events Table
-- Purpose: Track App Store Server Notifications V2 for idempotency
-- ==========================================================

-- 1. Create AppleNotificationEvents table
CREATE TABLE IF NOT EXISTS "AppleNotificationEvents" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_uuid TEXT NOT NULL,
  notification_type TEXT NOT NULL,
  subtype TEXT NULL,
  signed_date TIMESTAMPTZ NOT NULL,
  environment TEXT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create unique index for notification_uuid (idempotency)
CREATE UNIQUE INDEX IF NOT EXISTS idx_apple_notification_events_uuid_unique
  ON "AppleNotificationEvents" (notification_uuid);

-- 3. Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_apple_notification_events_processed
  ON "AppleNotificationEvents" (processed);
CREATE INDEX IF NOT EXISTS idx_apple_notification_events_type
  ON "AppleNotificationEvents" (notification_type);
CREATE INDEX IF NOT EXISTS idx_apple_notification_events_created_at
  ON "AppleNotificationEvents" (created_at DESC);

-- 4. Row Level Security
ALTER TABLE "AppleNotificationEvents" ENABLE ROW LEVEL SECURITY;

-- Only service role should access this table (no user access needed)
DROP POLICY IF EXISTS "AppleNotificationEvents_service_only" ON "AppleNotificationEvents";
CREATE POLICY "AppleNotificationEvents_service_only" ON "AppleNotificationEvents"
  FOR ALL
  USING (false);

-- 5. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_apple_notification_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_apple_notification_events_updated_at ON "AppleNotificationEvents";
CREATE TRIGGER trg_apple_notification_events_updated_at
  BEFORE UPDATE ON "AppleNotificationEvents"
  FOR EACH ROW
  EXECUTE FUNCTION set_apple_notification_events_updated_at();
