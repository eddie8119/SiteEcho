-- ==========================================================
-- Add shares column to Photos table
-- Purpose: Store share records for each photo
-- ==========================================================

-- Add shares column as JSONB to store array of PhotoShare objects
ALTER TABLE "Photos"
ADD COLUMN IF NOT EXISTS shares JSONB DEFAULT '[]'::jsonb;

-- Add index on shares for better query performance (optional)
CREATE INDEX IF NOT EXISTS idx_photos_shares ON "Photos" USING GIN (shares);
