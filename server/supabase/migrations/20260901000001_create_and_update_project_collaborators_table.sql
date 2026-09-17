-- ==========================================================
-- Create ProjectCollaborators Table (V1 Schema)
-- Purpose: Store project-level collaborators with user_id as primary identifier
-- Design: collaborator_user_id is NOT NULL, email is optional display field
-- ==========================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS "ProjectCollaborators" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES "Projects"(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  -- V1: collaborator_user_id is the primary identifier, NOT NULL
  collaborator_user_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  -- Email is optional display/snapshot field, not used for permission checks
  collaborator_email TEXT,
  -- V1: role is fixed to 'member', kept for future extensibility
  role TEXT NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT unique_project_collaborator UNIQUE (project_id, collaborator_user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_collaborators_user_id ON "ProjectCollaborators"(collaborator_user_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_project_id ON "ProjectCollaborators"(project_id);
CREATE INDEX IF NOT EXISTS idx_project_collaborators_owner_id ON "ProjectCollaborators"(owner_id);

-- Enable RLS
ALTER TABLE "ProjectCollaborators" ENABLE ROW LEVEL SECURITY;

-- Project owner can view collaborators for their projects
DROP POLICY IF EXISTS "ProjectCollaborators_select_owner" ON "ProjectCollaborators";
CREATE POLICY "ProjectCollaborators_select_owner" ON "ProjectCollaborators"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM "Projects"
      WHERE "Projects".id = project_id
      AND "Projects".user_id = auth.uid()
    )
  );

-- Project collaborators can view other collaborators in the same project
DROP POLICY IF EXISTS "ProjectCollaborators_select_member" ON "ProjectCollaborators";
CREATE POLICY "ProjectCollaborators_select_member" ON "ProjectCollaborators"
  FOR SELECT
  USING (
    collaborator_user_id = auth.uid()
  );

-- Only project owner can insert collaborators
DROP POLICY IF EXISTS "ProjectCollaborators_insert_owner" ON "ProjectCollaborators";
CREATE POLICY "ProjectCollaborators_insert_owner" ON "ProjectCollaborators"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Projects"
      WHERE "Projects".id = project_id
      AND "Projects".user_id = auth.uid()
    )
  );

-- Only project owner can delete collaborators
DROP POLICY IF EXISTS "ProjectCollaborators_delete_owner" ON "ProjectCollaborators";
CREATE POLICY "ProjectCollaborators_delete_owner" ON "ProjectCollaborators"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM "Projects"
      WHERE "Projects".id = project_id
      AND "Projects".user_id = auth.uid()
    )
  );
