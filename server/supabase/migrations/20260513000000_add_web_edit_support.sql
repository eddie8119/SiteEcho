-- ==========================================================
-- Add Web Edit Support to Photos Table
-- Purpose: Track whether a photo was last edited by App or Web
--          Enables bidirectional sync without infinite loops
-- ==========================================================

ALTER TABLE "Photos"
  ADD COLUMN IF NOT EXISTS updated_by TEXT NOT NULL DEFAULT 'app';

ALTER TABLE "Photos"
  ADD CONSTRAINT photos_updated_by_check
  CHECK (updated_by IN ('app', 'web'));

COMMENT ON COLUMN "Photos".updated_by IS 'Edit source: app=mobile, web=browser. Used to prevent sync loops during bidirectional sync.';
