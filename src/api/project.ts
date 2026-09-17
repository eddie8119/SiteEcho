import type { ApiResponse } from '@/types/request';
import type { ProjectResponse } from '@/types/response';
import type { CreateProjectSchema } from '@/utils/schemas/createProjectSchema';

import request from '@/utils/request';

export interface ProjectSyncResponse {
  total: number;
  synced: number;
  failed: number;
  results: Array<{
    client_id: string;
    success: boolean;
    id?: string;
    error?: string;
  }>;
}

export const projectApi = {
  // 用於概覽頁面
  getOverviewProjects: (): Promise<ApiResponse<ProjectResponse[]>> => {
    return request.get('/projects/overview');
  },
  sync: (
    projects: Array<{
      clientId: string;
      name: string;
      createdAt: string;
      lastUsedAt: string;
      updatedAt: string;
      groupReportNotes?: Record<string, unknown> | null;
    }>
  ): Promise<ApiResponse<ProjectSyncResponse>> => {
    return request.post('/projects/sync', { projects });
  },
  deleteBatch: (clientIds: string[]): Promise<ApiResponse<void>> => {
    return request.post('/projects/delete-batch', { client_ids: clientIds });
  },
  getProjects: (): Promise<ApiResponse<ProjectResponse[]>> => {
    return request.get('/projects');
  },
  getProjectById: (id: string): Promise<ApiResponse<ProjectResponse>> => {
    return request.get(`/projects/${id}`);
  },
  createProject: (payload: CreateProjectSchema): Promise<ApiResponse<ProjectResponse>> => {
    return request.post('/projects', payload);
  },
  updateProject: (
    id: string,
    payload: Partial<CreateProjectSchema>
  ): Promise<ApiResponse<ProjectResponse>> => {
    return request.patch(`/projects/${id}`, payload);
  },
  deleteProject: (id: string): Promise<ApiResponse<void>> => {
    return request.delete(`/projects/${id}`);
  },
};
