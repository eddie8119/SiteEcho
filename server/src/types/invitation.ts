export type ProjectInvitationRecord = {
  id: string;
  project_id: string;
  inviter_id: string;
  accepted_by_user_id: string | null;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ProjectInvitationResponse = {
  id: string;
  projectId: string;
  inviterId: string;
  inviterName: string | null;
  projectName: string;
  token: string;
  status: 'pending' | 'accepted' | 'expired';
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
};
