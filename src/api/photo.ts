import type { ApiResponse } from '@/types/request';

import request from '@/utils/request';

export enum PhotoSyncLevel {
  NONE = 'none', // Layer 1: Local only
  THUMBNAIL = 'thumbnail', // Layer 2: Cloud thumbnail
  EVIDENCE = 'evidence', // Layer 3: Cloud high-quality
}

export interface PhotoSyncPayloadItem {
  clientId: string;
  projectId?: string | null;
  takenAt: string;
  constructions?: string[] | null;
  space?: string | null;
  status?: string;
  pendingType?: string | null;
  note?: string | null;
  reportNote?: string | null;
  parentPhotoId?: string | null;
  relatedPhotoIds?: string[] | null;
  fileBase64: string;
  mimeType?: string;
  syncLevel?: PhotoSyncLevel;
  isEvidence?: boolean;
  isSampled?: boolean;
  isReported?: boolean;
  shares?: Record<string, unknown>[] | null;
  deletedAt?: string | null;
}

export interface PhotoSyncResultItem {
  clientId: string;
  success: boolean;
  id?: string;
  error?: string;
}

export interface PhotoSyncResponse {
  total: number;
  synced: number;
  failed: number;
  results: PhotoSyncResultItem[];
}

export interface RemotePhoto {
  id: string;
  clientId: string;
  userId: string;
  uploadedBy?: string;
  projectId: string | null;
  filePath: string;
  fileSize: number | null;
  mimeType: string | null;
  takenAt: string;
  constructions: string[];
  space: string | null;
  status: string;
  pendingType: string | null;
  note: string | null;
  reportNote?: string | null;
  parentPhotoId?: string | null;
  relatedPhotoIds?: string[] | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  url: string | null;
  thumbnailUrl: string | null;
  syncLevel?: PhotoSyncLevel;
  isEvidence: boolean;
  updatedBy: 'app' | 'web';
  deletedAt: string | null;
}

export interface PhotoUpdatePayload {
  note?: string;
  reportNote?: string;
  space?: string;
  status?: string;
  pendingType?: string | null;
  constructions?: string[];
  parentPhotoId?: string | null;
  relatedPhotoIds?: string[];
  syncLevel?: PhotoSyncLevel;
  isEvidence?: boolean;
}

export interface PhotoBatchUpdatePayloadItem {
  clientId: string;
  note?: string;
  reportNote?: string;
  space?: string;
  status?: string;
  pendingType?: string | null;
  constructions?: string[];
  parentPhotoId?: string | null;
  relatedPhotoIds?: string[];
  syncLevel?: PhotoSyncLevel;
  isEvidence?: boolean;
}

export interface PhotoBatchUpdateResponse {
  total: number;
  synced: number;
  failed: number;
  results: Array<{
    clientId: string;
    success: boolean;
    data?: RemotePhoto;
    error?: string;
  }>;
}

export const photoApi = {
  sync: (photos: PhotoSyncPayloadItem[]): Promise<ApiResponse<PhotoSyncResponse>> => {
    return request.post('/photos/sync', { photos });
  },
  updateBatch: (
    photos: PhotoBatchUpdatePayloadItem[]
  ): Promise<ApiResponse<PhotoBatchUpdateResponse>> => {
    return request.post('/photos/update-batch', { photos });
  },
  deleteBatch: (clientIds: string[]): Promise<ApiResponse<void>> => {
    return request.post('/photos/delete-batch', { client_ids: clientIds });
  },
  getAll: (
    includeDeleted?: boolean,
    onlyDeleted?: boolean
  ): Promise<ApiResponse<RemotePhoto[]>> => {
    const params = new URLSearchParams();
    if (includeDeleted) params.append('include_deleted', 'true');
    if (onlyDeleted) params.append('only_deleted', 'true');
    const queryString = params.toString();
    return request.get(`/photos${queryString ? `?${queryString}` : ''}`);
  },
  getByProjectId: (
    projectId: string,
    includeDeleted?: boolean
  ): Promise<ApiResponse<RemotePhoto[]>> => {
    const params = includeDeleted ? '&include_deleted=true' : '';
    return request.get(`/photos?project_id=${projectId}${params}`);
  },
  update: (id: string, payload: PhotoUpdatePayload): Promise<ApiResponse<RemotePhoto>> => {
    return request.patch(`/photos/${id}`, payload);
  },
  deleteOne: (id: string): Promise<ApiResponse<void>> => {
    return request.delete(`/photos/${id}`);
  },
  cleanupExpiredTrash: (): Promise<ApiResponse<{ deleted: number }>> => {
    return request.post('/photos/cleanup-expired-trash');
  },
  getTrashPhotos: (): Promise<ApiResponse<RemotePhoto[]>> => {
    return request.get('/photos?only_deleted=true');
  },
  softDeleteBatch: (ids: string[]): Promise<ApiResponse<void>> => {
    return request.post('/photos/soft-delete-batch', { ids });
  },
  restoreBatch: (ids: string[]): Promise<ApiResponse<void>> => {
    return request.post('/photos/restore-batch', { ids });
  },
};

/**
 * Helper function to delete a photo by clientId with consistent error handling
 * Used by usePhotoSync and useTrash
 */
export async function deletePhotoByClientId(clientId: string): Promise<boolean> {
  try {
    const response = await photoApi.deleteBatch([clientId]);
    return response.success ?? false;
  } catch (error) {
    console.error('[deletePhotoByClientId] 刪除照片失敗:', error);
    return false;
  }
}

/**
 * Helper function to delete a photo by server ID (for Web use)
 * Used by Web composable
 */
export async function deletePhotoById(id: string): Promise<boolean> {
  try {
    const response = await photoApi.deleteOne(id);
    return response.success ?? false;
  } catch (error) {
    console.error('[deletePhotoById] 刪除照片失敗:', error);
    return false;
  }
}

// Deprecated: use deletePhotoByClientId or deletePhotoById instead
export async function deletePhoto(id: string): Promise<boolean> {
  return deletePhotoByClientId(id);
}
