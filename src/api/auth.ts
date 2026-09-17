import type { ApiResponse } from '@/types/request';
import type { AuthResponse } from '@/types/response';
import type { LoginSchema } from '@/utils/schemas/loginSchema';

import request from '@/utils/request';

export const authApi = {
  login: (payload: LoginSchema): Promise<ApiResponse<AuthResponse>> => {
    return request.post('/auth/login', payload);
  },
  logout: (payload: { refreshToken: string }): Promise<ApiResponse<AuthResponse>> => {
    return request.post('/auth/logout', payload);
  },
};
