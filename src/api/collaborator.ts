import type { ApiResponse } from '@/types/request';
import type {
  CollaboratorRole,
  GlobalCollaboratorResponse,
  ProjectCollaboratorResponse,
} from '@/types/response';

import request from '@/utils/request';

interface AddCollaboratorPayload {
  collaboratorEmail: string;
  role?: CollaboratorRole;
}

interface UpdateCollaboratorPayload {
  role: CollaboratorRole;
}

interface CollaboratorInfoResponse {
  isCollaborator: boolean;
  collaboratingProjectIds: string[];
}

export const collaboratorApi = {
  // ==================== Project Collaborators ====================

  // Get collaborator info for authenticated user
  getCollaboratorInfo: (): Promise<ApiResponse<CollaboratorInfoResponse>> => {
    return request.get('/collaborators/info');
  },

  // Get all collaborators across all projects owned by the user
  getAllProjectCollaborators: (): Promise<ApiResponse<ProjectCollaboratorResponse[]>> => {
    return request.get('/collaborators/project/all');
  },

  // Get all collaborators for a specific project
  getProjectCollaborators: (
    projectId: string
  ): Promise<ApiResponse<ProjectCollaboratorResponse[]>> => {
    return request.get(`/collaborators/project/${projectId}`);
  },

  // Add a collaborator to a specific project
  addProjectCollaborator: (
    projectId: string,
    payload: AddCollaboratorPayload
  ): Promise<ApiResponse<ProjectCollaboratorResponse>> => {
    return request.post(`/collaborators/project/${projectId}`, payload);
  },

  // Update a project collaborator's role
  updateProjectCollaborator: (
    projectId: string,
    collaboratorId: string,
    payload: UpdateCollaboratorPayload
  ): Promise<ApiResponse<ProjectCollaboratorResponse>> => {
    return request.patch(`/collaborators/project/${projectId}/${collaboratorId}`, payload);
  },

  // Remove a collaborator from a specific project
  removeProjectCollaborator: (
    projectId: string,
    collaboratorId: string
  ): Promise<ApiResponse<void>> => {
    return request.delete(`/collaborators/project/${projectId}/${collaboratorId}`);
  },

  // ==================== Global Collaborators ====================

  // Get all global collaborators
  getGlobalCollaborators: (): Promise<ApiResponse<GlobalCollaboratorResponse[]>> => {
    return request.get('/collaborators/global');
  },

  // Add a global collaborator
  addGlobalCollaborator: (
    payload: AddCollaboratorPayload
  ): Promise<ApiResponse<GlobalCollaboratorResponse>> => {
    return request.post('/collaborators/global', payload);
  },

  // Update a global collaborator's role
  updateGlobalCollaborator: (
    collaboratorId: string,
    payload: UpdateCollaboratorPayload
  ): Promise<ApiResponse<GlobalCollaboratorResponse>> => {
    return request.patch(`/collaborators/global/${collaboratorId}`, payload);
  },

  // Remove a global collaborator
  removeGlobalCollaborator: (collaboratorId: string): Promise<ApiResponse<void>> => {
    return request.delete(`/collaborators/global/${collaboratorId}`);
  },
};
