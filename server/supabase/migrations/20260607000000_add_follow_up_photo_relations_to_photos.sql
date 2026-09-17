-- ==========================================================
-- Add Follow-up Photo Relations to Photos Table
-- Purpose: Persist original/follow-up photo linkage in Supabase
--          so cloud sync and archive/restore keep evidence chains intact.
-- ==========================================================

ALTER TABLE "Photos"
  ADD COLUMN IF NOT EXISTS parent_photo_id UUID NULL,
  ADD COLUMN IF NOT EXISTS related_photo_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE "Photos_Archive"
  ADD COLUMN IF NOT EXISTS parent_photo_id UUID NULL,
  ADD COLUMN IF NOT EXISTS related_photo_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_photos_parent_photo_id ON "Photos" (parent_photo_id);
CREATE INDEX IF NOT EXISTS idx_photos_related_photo_ids ON "Photos" USING GIN (related_photo_ids);

CREATE INDEX IF NOT EXISTS idx_photos_archive_parent_photo_id ON "Photos_Archive" (parent_photo_id);
CREATE INDEX IF NOT EXISTS idx_photos_archive_related_photo_ids ON "Photos_Archive" USING GIN (related_photo_ids);

COMMENT ON COLUMN "Photos".parent_photo_id IS 'Client-side photo UUID of the original photo for a follow-up photo.';
COMMENT ON COLUMN "Photos".related_photo_ids IS 'Client-side photo UUIDs of follow-up photos related to the original photo.';

COMMENT ON COLUMN "Photos_Archive".parent_photo_id IS 'Client-side photo UUID of the original photo for a follow-up photo.';
COMMENT ON COLUMN "Photos_Archive".related_photo_ids IS 'Client-side photo UUIDs of follow-up photos related to the original photo.';

CREATE OR REPLACE FUNCTION archive_old_photos()
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER;
BEGIN
  INSERT INTO "Photos_Archive" (
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    parent_photo_id, related_photo_ids,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  )
  SELECT
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    parent_photo_id, related_photo_ids,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  FROM "Photos"
  WHERE
    created_at < NOW() - INTERVAL '1 year'
    AND is_evidence = false
    AND is_reported = false
  ;

  GET DIAGNOSTICS archived_count = ROW_COUNT;

  DELETE FROM "Photos"
  WHERE
    created_at < NOW() - INTERVAL '1 year'
    AND is_evidence = false
    AND is_reported = false;

  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION restore_photos_from_archive(photo_ids UUID[])
RETURNS INTEGER AS $$
DECLARE
  restored_count INTEGER;
BEGIN
  INSERT INTO "Photos" (
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    parent_photo_id, related_photo_ids,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  )
  SELECT
    id, client_id, user_id, project_id, file_path, file_size, mime_type,
    taken_at, constructions, space, status, pending_type, note,
    parent_photo_id, related_photo_ids,
    sync_level, is_evidence, is_sampled, is_reported, shares,
    created_at, updated_at
  FROM "Photos_Archive"
  WHERE id = ANY(photo_ids)
  ON CONFLICT (user_id, client_id) DO NOTHING
  ;

  GET DIAGNOSTICS restored_count = ROW_COUNT;

  DELETE FROM "Photos_Archive"
  WHERE id = ANY(photo_ids);

  RETURN restored_count;
END;
$$ LANGUAGE plpgsql;
