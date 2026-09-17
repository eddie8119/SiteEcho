import type { CollaboratorRole } from './requestBody';

export type ProjectCollaboratorRecord = {
  id: string;
  project_id: string;
  owner_id: string;
  collaborator_email: string;
  collaborator_user_id?: string | null;
  role: CollaboratorRole;
  created_at: string;
  updated_at: string;
};

export type GlobalCollaboratorRecord = {
  id: string;
  owner_id: string;
  collaborator_email: string;
  role: CollaboratorRole;
  created_at: string;
  updated_at: string;
};

export type ProjectRecord = {
  id: string;
  user_id: string;
};

export type MergedCollaboratorRecord = {
  id: string;
  project_id: string | null;
  owner_id: string;
  collaborator_email: string;
  collaborator_name: string | null;
  role: CollaboratorRole;
  is_global: boolean;
  global_role: CollaboratorRole | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInvitationRecord = {
  id: string;
  project_id: string;
  owner_id: string;
  collaborator_email: string;
  role: CollaboratorRole;
  created_at: string;
  updated_at: string;
};

export type UserRecord = {
  email: string;
  name: string | null;
};
