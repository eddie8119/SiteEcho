-- ==========================================================
-- Update PendingType Values
-- Purpose: Update old pending_type values to new enum values
--          'discuss' → 'issue'
--          'modify' → 'fix'
--          'none' → null (uncategorized)
-- ==========================================================

-- Update old 'discuss' values to 'issue'
UPDATE "Photos"
SET pending_type = 'issue'
WHERE pending_type = 'discuss';

-- Update old 'modify' values to 'fix'
UPDATE "Photos"
SET pending_type = 'fix'
WHERE pending_type = 'modify';

-- Update old 'none' values to null (uncategorized)
UPDATE "Photos"
SET pending_type = NULL
WHERE pending_type = 'none';
