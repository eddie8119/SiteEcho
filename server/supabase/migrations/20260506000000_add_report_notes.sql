-- ==========================================================
-- Add Report Notes to Photos and Projects Tables
-- Purpose: Support custom report notes for photos and groups
--          This allows users to create polished descriptions for reports
-- ==========================================================

-- 1. Add report_note column to Photos table
ALTER TABLE "Photos"
ADD COLUMN IF NOT EXISTS report_note TEXT NULL DEFAULT '';

-- 2. Add group_report_notes column to Projects table
ALTER TABLE "Projects"
ADD COLUMN IF NOT EXISTS group_report_notes JSONB NULL DEFAULT '{}';

-- 3. Add comments for documentation
COMMENT ON COLUMN "Photos".report_note IS 'Custom description for reports (overrides note when exporting)';
COMMENT ON COLUMN "Projects".group_report_notes IS 'Group-level notes organized by space-construction key (JSONB)';
