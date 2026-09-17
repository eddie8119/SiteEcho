-- ==========================================================
-- Add Consistency Constraint between is_evidence and sync_level
-- Purpose: Ensure is_evidence and sync_level remain synchronized
--          to prevent data inconsistency
-- ==========================================================

-- Step 1: Fix any existing inconsistent data
-- If sync_level is 'evidence' but is_evidence is false, set is_evidence to true
UPDATE "Photos"
SET is_evidence = true
WHERE sync_level = 'evidence' AND is_evidence = false;

-- If sync_level is not 'evidence' but is_evidence is true, set sync_level to 'evidence'
UPDATE "Photos"
SET sync_level = 'evidence'
WHERE is_evidence = true AND sync_level != 'evidence';

-- Step 2: Add check constraint to ensure is_evidence and sync_level remain consistent
-- Rule: 
--   - is_evidence = true MUST have sync_level = 'evidence'
--   - is_evidence = false MUST have sync_level IN ('none', 'thumbnail')
ALTER TABLE "Photos"
  ADD CONSTRAINT photos_evidence_sync_consistency 
  CHECK (
    (is_evidence = true AND sync_level = 'evidence') OR
    (is_evidence = false AND sync_level IN ('none', 'thumbnail'))
  );

COMMENT ON CONSTRAINT photos_evidence_sync_consistency ON "Photos" IS 
'Ensures is_evidence boolean flag is consistent with sync_level text value';
