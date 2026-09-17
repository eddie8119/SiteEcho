-- ==========================================================
-- Database Optimization for Photos Table (Scale to Billions)
-- Purpose: Optimize Photos table for handling hundreds of millions
--          to billions of records with proper indexing and archiving
-- ==========================================================

-- 1. Add Composite Indexes for Common Query Patterns
-- These indexes combine frequently queried columns for better performance

-- Composite index for user queries with time ordering (most common pattern)
CREATE INDEX IF NOT EXISTS idx_photos_user_taken_at ON "Photos" (user_id, taken_at DESC);

-- Composite index for project-based queries
CREATE INDEX IF NOT EXISTS idx_photos_user_project ON "Photos" (user_id, project_id);

-- Composite index for evidence photos by user
CREATE INDEX IF NOT EXISTS idx_photos_user_evidence ON "Photos" (user_id, is_evidence);

-- Composite index for sync level filtering by user
CREATE INDEX IF NOT EXISTS idx_photos_user_sync_level ON "Photos" (user_id, sync_level);

-- Composite index for reported photos by user
CREATE INDEX IF NOT EXISTS idx_photos_user_reported ON "Photos" (user_id, is_reported);

-- 2. Create Archive Table for Cold Data
-- Photos older than 1 year and not marked as evidence will be moved here

CREATE TABLE IF NOT EXISTS "Photos_Archive" (
  -- Same structure as Photos table
  id UUID PRIMARY KEY,
  client_id UUID NOT NULL,
  user_id UUID NOT NULL,
  project_id UUID NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NULL,
  mime_type TEXT NULL,
  taken_at TIMESTAMPTZ NOT NULL,
  constructions TEXT[] NULL,
  space TEXT NULL,
  status TEXT NOT NULL DEFAULT 'normal',
  pending_type TEXT NULL,
  note TEXT NULL DEFAULT '',
  sync_level TEXT NOT NULL DEFAULT 'none',
  is_evidence BOOLEAN NOT NULL DEFAULT false,
  is_sampled BOOLEAN NOT NULL DEFAULT false,
  is_reported BOOLEAN NOT NULL DEFAULT false,
  shares JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for Archive table (optimized for cold data queries)
CREATE INDEX IF NOT EXISTS idx_photos_archive_user_id ON "Photos_Archive" (user_id);
CREATE INDEX IF NOT EXISTS idx_photos_archive_user_project ON "Photos_Archive" (user_id, project_id);
CREATE INDEX IF NOT EXISTS idx_photos_archive_taken_at ON "Photos_Archive" (taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_photos_archive_archived_at ON "Photos_Archive" (archived_at DESC);

-- RLS for Archive table
ALTER TABLE "Photos_Archive" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Photos_Archive_select_own" ON "Photos_Archive"
  FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Create Function to Archive Old Photos
-- Moves photos older than 1 year (not evidence) to archive table

CREATE OR REPLACE FUNCTION archive_old_photos()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  -- Move photos to archive
  INSERT INTO "Photos_Archive" (
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  )
  SELECT 
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  FROM "Photos"
  WHERE 
    created_at < NOW() - INTERVAL '1 year'
    AND is_evidence = false
    AND is_reported = false
  RETURNING id INTO archived_count;
  
  -- Delete from main table
  DELETE FROM "Photos"
  WHERE 
    created_at < NOW() - INTERVAL '1 year'
    AND is_evidence = false
    AND is_reported = false;
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- 4. Create Function to Restore Photos from Archive
-- Restores photos from archive to main table

CREATE OR REPLACE FUNCTION restore_photos_from_archive(photo_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER;
BEGIN
  -- Move photos back to main table
  INSERT INTO "Photos" (
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  )
  SELECT 
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  FROM "Photos_Archive"
  WHERE id = ANY(photo_ids)
  ON CONFLICT (user_id, client_id) DO NOTHING
  RETURNING id INTO restored_count;
  
  -- Delete from archive
  DELETE FROM "Photos_Archive"
  WHERE id = ANY(photo_ids);
  
  RETURN restored_count;
END;
$$ LANGUAGE plpgsql;

-- 5. Create Scheduled Job for Auto-Archiving
-- Note: Requires pg_cron extension. If not available, run manually or via cron job
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('archive-old-photos', '0 2 * * *', 'SELECT archive_old_photos();');

-- 6. Add Comments for Documentation
COMMENT ON TABLE "Photos_Archive" IS 'Archive table for old photos (older than 1 year, not evidence) to keep main table performant';
COMMENT ON FUNCTION archive_old_photos() IS 'Archives photos older than 1 year that are not marked as evidence or reported';
COMMENT ON FUNCTION restore_photos_from_archive(UUID[]) IS 'Restores photos from archive back to main table';

-- 7. Monitoring Queries (for reference)
-- These queries help monitor the size and growth of the tables

-- Check table sizes
-- SELECT 
--   schemaname,
--   tablename,
--   pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
-- FROM pg_tables
-- WHERE tablename LIKE '%photos%'
-- ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check index usage
-- SELECT 
--   schemaname,
--   tablename,
--   indexname,
--   idx_scan as index_scans,
--   pg_size_pretty(pg_relation_size(indexrelid)) as index_size
-- FROM pg_stat_user_indexes
-- WHERE tablename LIKE '%photos%'
-- ORDER BY idx_scan DESC;
