import type { ApiResponse } from '@/types/request';
import type { DraftResponse } from '@/types/response';

import request from '@/utils/request';

export const draftApi = {
  getDraft: (): Promise<ApiResponse<DraftResponse>> => {
    return request.get('/draft');
  },
  createdraft: (payload: Partial<DraftResponse>): Promise<ApiResponse<DraftResponse>> => {
    return request.post('/draft', payload);
  },
  updatedraft: (
    id: string,
    payload: Partial<DraftResponse>
  ): Promise<ApiResponse<DraftResponse>> => {
    return request.patch(`/draft/${id}`, payload);
  },
  deletedraft: (id: string): Promise<ApiResponse<void>> => {
    return request.delete(`/draft/${id}`);
  },
};
