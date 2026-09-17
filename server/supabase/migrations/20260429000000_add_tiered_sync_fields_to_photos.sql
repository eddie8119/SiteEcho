-- ==========================================================
-- Add Tiered Sync Architecture Fields to Photos Table
-- Purpose: Support Layer 1 (Local), Layer 2 (Thumbnail), Layer 3 (Evidence)
-- ==========================================================

-- Add tiered sync fields to Photos table
ALTER TABLE "Photos"
  ADD COLUMN IF NOT EXISTS sync_level TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS is_evidence BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_sampled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_reported BOOLEAN NOT NULL DEFAULT false;

-- Add index for faster querying of evidence photos
CREATE INDEX IF NOT EXISTS idx_photos_sync_level ON "Photos" (sync_level);
CREATE INDEX IF NOT EXISTS idx_photos_is_evidence ON "Photos" (is_evidence);

-- Add check constraint for sync_level values
ALTER TABLE "Photos"
  ADD CONSTRAINT photos_sync_level_check 
  CHECK (sync_level IN ('none', 'thumbnail', 'evidence'));

COMMENT ON COLUMN "Photos".sync_level IS 'Sync level: none=local only, thumbnail=cloud thumbnail, evidence=cloud high-quality';
COMMENT ON COLUMN "Photos".is_evidence IS 'Whether photo is marked as formal evidence (Layer 3)';
COMMENT ON COLUMN "Photos".is_sampled IS 'Whether photo was sampled by system for cloud thumbnail (Layer 2)';
COMMENT ON COLUMN "Photos".is_reported IS 'Whether photo was used in report generation (triggers Layer 3)';
