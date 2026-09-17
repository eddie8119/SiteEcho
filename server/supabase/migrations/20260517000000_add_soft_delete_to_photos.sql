-- ==========================================================
-- Add Soft Delete Support to Photos Table
-- Purpose: Support trash bin functionality with 30-day recovery
-- ==========================================================

-- Add deleted_at column for soft delete
ALTER TABLE "Photos" 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;

-- Create index on deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_photos_deleted_at ON "Photos" (deleted_at);

-- Update RLS policy to exclude soft-deleted photos by default
DROP POLICY IF EXISTS "Photos_select_own" ON "Photos";
CREATE POLICY "Photos_select_own" ON "Photos"
  FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Create separate policy for selecting soft-deleted photos (for trash bin)
DROP POLICY IF EXISTS "Photos_select_own_with_deleted" ON "Photos";
CREATE POLICY "Photos_select_own_with_deleted" ON "Photos"
  FOR SELECT
  USING (auth.uid() = user_id);

-- Comment on deleted_at column
COMMENT ON COLUMN "Photos".deleted_at IS 'Soft delete timestamp. NULL = active, NOT NULL = deleted (in trash)';
