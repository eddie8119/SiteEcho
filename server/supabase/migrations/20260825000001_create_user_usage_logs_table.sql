-- ==========================================================
-- Create UserUsageLogs Table
-- Purpose: Track monthly feature usage (report exports, follow-up photos) per user
-- ==========================================================

CREATE TABLE IF NOT EXISTS "UserUsageLogs" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'report_export' | 'follow_up_photo'
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_usage_logs_user_action_time
  ON "UserUsageLogs" (user_id, action_type, created_at DESC);

-- Enable RLS
ALTER TABLE "UserUsageLogs" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "UserUsageLogs_select_own" ON "UserUsageLogs";
CREATE POLICY "UserUsageLogs_select_own" ON "UserUsageLogs"
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "UserUsageLogs_insert_own" ON "UserUsageLogs";
CREATE POLICY "UserUsageLogs_insert_own" ON "UserUsageLogs"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
