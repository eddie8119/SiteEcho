-- ==========================================================
-- Fix Photos-Projects Foreign Key Constraint
-- Purpose: Change ON DELETE SET NULL to ON DELETE NO ACTION
--          to prevent constraint violation when deleting projects
-- ==========================================================
-- The composite foreign key (project_id, user_id) with ON DELETE SET NULL
-- tries to set both columns to NULL when a project is deleted.
-- Since user_id has a NOT NULL constraint, this causes a violation.
-- The application code already handles setting project_id to NULL before deletion.

-- Drop the existing constraint
ALTER TABLE "Photos" DROP CONSTRAINT IF EXISTS fk_photos_project;

-- Recreate the constraint with ON DELETE NO ACTION
ALTER TABLE "Photos"
  ADD CONSTRAINT fk_photos_project
  FOREIGN KEY (project_id, user_id)
  REFERENCES "Projects"(client_id, user_id)
  ON DELETE NO ACTION;
