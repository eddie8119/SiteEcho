import axios from 'axios';

import type { CollaboratorInvitationResponse, CollaboratorRole } from '@/types/response';

import { Language } from '@/types/language';
import request from '@/utils/request';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});

// Get my received invitations
export const getMyInvitations = async (): Promise<CollaboratorInvitationResponse[]> => {
  const response = await request.get('/invitations/received');
  return response.data;
};

// Get sent invitations
export const getSentInvitations = async (): Promise<CollaboratorInvitationResponse[]> => {
  const response = await request.get('/invitations/sent');
  return response.data;
};

const getLocaleLanguage = (): Language => {
  return localStorage.getItem('language') as Language;
};

// Create project invitation (V1: Share link, no email required)
export const createProjectInvitation = async (
  projectId: string
): Promise<{ token: string; invitationUrl: string }> => {
  const response = await request.post(`/invitations/project/${projectId}`);
  return response.data;
};

// Create global invitation
export const createGlobalInvitation = async (
  collaboratorEmail: string,
  role: CollaboratorRole,
  locale: Language = getLocaleLanguage()
): Promise<CollaboratorInvitationResponse> => {
  const response = await request.post('/invitations/global', {
    collaboratorEmail,
    role,
    locale,
  });
  return response.data;
};

// Accept invitation
export const acceptInvitation = async (invitationToken: string): Promise<void> => {
  await request.post(`/invitations/accept/${invitationToken}`);
};

// Reject invitation
export const rejectInvitation = async (invitationId: string): Promise<void> => {
  await request.post(`/invitations/reject/${invitationId}`);
};

// Cancel invitation (by inviter)
export const cancelInvitation = async (invitationId: string): Promise<void> => {
  await request.delete(`/invitations/${invitationId}`);
};

// Get invitation by token (public, no auth required)
export const getInvitationByToken = async (token: string) => {
  const { data } = await publicApi.get(`/invitations/token/${token}`, {
    params: { _t: Date.now() },
    headers: { 'Cache-Control': 'no-store' },
  });
  return data?.data;
};
