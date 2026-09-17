-- ==========================================================
-- Photos Table & Storage Bucket
-- Purpose: Sync photos captured offline (IndexedDB) to cloud
-- after user registers/logs in.
-- ==========================================================

-- 1. Photos Table
CREATE TABLE IF NOT EXISTS "Photos" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- client_id: the UUID originally generated on the client (IndexedDB)
  -- Used to avoid duplicate uploads when retrying.
  client_id UUID NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NULL,

  -- Path inside the `photos` Storage bucket (e.g., `{user_id}/{client_id}.jpg`)
  file_path TEXT NOT NULL,
  file_size BIGINT NULL,
  mime_type TEXT NULL,

  taken_at TIMESTAMPTZ NOT NULL,
  constructions TEXT[] NULL,
  space TEXT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  pending_type TEXT NULL,
  note TEXT NULL DEFAULT '',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure the same local photo is not uploaded twice by the same user
  CONSTRAINT photos_user_client_unique UNIQUE (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS idx_photos_user_id ON "Photos" (user_id);
CREATE INDEX IF NOT EXISTS idx_photos_project_id ON "Photos" (project_id);
CREATE INDEX IF NOT EXISTS idx_photos_taken_at ON "Photos" (taken_at DESC);

-- 2. Row Level Security
ALTER TABLE "Photos" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Photos_select_own" ON "Photos";
CREATE POLICY "Photos_select_own" ON "Photos"
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Photos_insert_own" ON "Photos";
CREATE POLICY "Photos_insert_own" ON "Photos"
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Photos_update_own" ON "Photos";
CREATE POLICY "Photos_update_own" ON "Photos"
  FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Photos_delete_own" ON "Photos";
CREATE POLICY "Photos_delete_own" ON "Photos"
  FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Storage Bucket for photo blobs
INSERT INTO storage.buckets (id, name, public)
VALUES ('photos', 'photos', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies: Each user can only access files under their own user-id folder
DROP POLICY IF EXISTS "Photos_storage_select_own" ON storage.objects;
CREATE POLICY "Photos_storage_select_own" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Photos_storage_insert_own" ON storage.objects;
CREATE POLICY "Photos_storage_insert_own" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Photos_storage_update_own" ON storage.objects;
CREATE POLICY "Photos_storage_update_own" ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Photos_storage_delete_own" ON storage.objects;
CREATE POLICY "Photos_storage_delete_own" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'photos'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 5. Auto-update `updated_at`
CREATE OR REPLACE FUNCTION set_photos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_photos_updated_at ON "Photos";
CREATE TRIGGER trg_photos_updated_at
  BEFORE UPDATE ON "Photos"
  FOR EACH ROW
  EXECUTE FUNCTION set_photos_updated_at();
