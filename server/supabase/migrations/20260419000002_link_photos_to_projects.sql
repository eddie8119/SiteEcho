-- Add foreign key constraint to Photos table for project_id
-- referencing the Projects table.

ALTER TABLE "Photos"
  ALTER COLUMN project_id TYPE UUID USING project_id::uuid;

-- Drop existing constraint if it exists (to allow re-running this migration)
ALTER TABLE "Photos" DROP CONSTRAINT IF EXISTS fk_photos_project;

ALTER TABLE "Photos"
  ADD CONSTRAINT fk_photos_project
  FOREIGN KEY (project_id, user_id)
  REFERENCES "Projects"(client_id, user_id)
  ON DELETE NO ACTION;
