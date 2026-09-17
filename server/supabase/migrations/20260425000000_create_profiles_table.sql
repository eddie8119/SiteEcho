-- ==========================================================
-- Profiles Table
-- Purpose: Extended user profile information including subscription flags
-- ==========================================================

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS "Profiles" (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  
  -- Subscription flags (POC: simple boolean for paid status)
  is_developer BOOLEAN NOT NULL DEFAULT false,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  stripe_customer_id TEXT NULL,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT profiles_email_unique UNIQUE (email)
);

CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer_id ON "Profiles" (stripe_customer_id);

-- 2. Row Level Security
ALTER TABLE "Profiles" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Profiles_select_own" ON "Profiles";
CREATE POLICY "Profiles_select_own" ON "Profiles"
  FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles_insert_own" ON "Profiles";
CREATE POLICY "Profiles_insert_own" ON "Profiles"
  FOR INSERT
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Profiles_update_own" ON "Profiles";
CREATE POLICY "Profiles_update_own" ON "Profiles"
  FOR UPDATE
  USING (auth.uid() = id);

-- 3. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON "Profiles";
CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON "Profiles"
  FOR EACH ROW
  EXECUTE FUNCTION set_profiles_updated_at();
