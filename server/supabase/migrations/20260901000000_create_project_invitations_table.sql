-- ==========================================================
-- Create ProjectInvitations Table
-- Purpose: Store project invitation tokens for V1 share-link based invitations
-- Design: Single-use tokens, no email dependency, Owner/Member only
-- ==========================================================

CREATE TABLE IF NOT EXISTS "ProjectInvitations" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES "Projects"(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES "Profiles"(id) ON DELETE CASCADE,
  accepted_by_user_id UUID REFERENCES "Profiles"(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'accepted' | 'expired'
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON "ProjectInvitations"(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON "ProjectInvitations"(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_inviter ON "ProjectInvitations"(inviter_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status_expires ON "ProjectInvitations"(status, expires_at);

-- Enable RLS
ALTER TABLE "ProjectInvitations" ENABLE ROW LEVEL SECURITY;

-- Anyone can view invitation details by token (for Web Landing / App card display)
DROP POLICY IF EXISTS "ProjectInvitations_select_by_token" ON "ProjectInvitations";
CREATE POLICY "ProjectInvitations_select_by_token" ON "ProjectInvitations"
  FOR SELECT
  USING (true);

-- Only project owner can create invitations
DROP POLICY IF EXISTS "ProjectInvitations_insert_owner" ON "ProjectInvitations";
CREATE POLICY "ProjectInvitations_insert_owner" ON "ProjectInvitations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Projects"
      WHERE "Projects".id = project_id
      AND "Projects".user_id = auth.uid()
    )
  );

-- Only authenticated users can accept invitations
DROP POLICY IF EXISTS "ProjectInvitations_update_accept" ON "ProjectInvitations";
CREATE POLICY "ProjectInvitations_update_accept" ON "ProjectInvitations"
  FOR UPDATE
  USING (true)
  WITH CHECK (auth.uid() IS NOT NULL);
