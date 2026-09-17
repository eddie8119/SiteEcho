-- Add resolved_at column to Photos table for tracking when issues are resolved
-- This supports the evidence chain feature for problem tracking

ALTER TABLE "Photos" 
ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ NULL;

-- Add index for better query performance on resolved photos
CREATE INDEX IF NOT EXISTS idx_photos_resolved_at ON "Photos" (resolved_at DESC);
