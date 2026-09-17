-- Track the user who captured/uploaded a photo separately from the project owner.
-- Photos.user_id remains the project owner for shared-project storage accounting.
ALTER TABLE "Photos"
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_photos_uploaded_by ON "Photos" (uploaded_by);

-- Existing rows predate collaborator uploads. Keep uploaded_by NULL so only
-- the project owner can delete them under the legacy-safe authorization path.
