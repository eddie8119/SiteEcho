-- ==========================================================
-- Projects Table
-- Purpose: Sync projects created offline (IndexedDB) to cloud
-- after user registers/logs in.
-- ==========================================================

-- 1. Projects Table
CREATE TABLE IF NOT EXISTS "Projects" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- client_id: the UUID originally generated on the client (IndexedDB)
  -- Used to avoid duplicate syncs when retrying.
  client_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  
  last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure the same local project is not created twice by the same user
  CONSTRAINT projects_user_client_unique UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON "Projects" (user_id);
CREATE INDEX IF NOT EXISTS idx_projects_last_used_at ON "Projects" (last_used_at DESC);

-- 2. Row Level Security
ALTER TABLE "Projects" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Projects_select_own" ON "Projects";
CREATE POLICY "Projects_select_own" ON "Projects"
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Projects_insert_own" ON "Projects";
CREATE POLICY "Projects_insert_own" ON "Projects"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Projects_update_own" ON "Projects";
CREATE POLICY "Projects_update_own" ON "Projects"
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Projects_delete_own" ON "Projects";
CREATE POLICY "Projects_delete_own" ON "Projects"
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_projects_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON "Projects";
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON "Projects"
  FOR EACH ROW
  EXECUTE FUNCTION set_projects_updated_at();
