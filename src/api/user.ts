import type { ApiResult } from '@/types/request';
import type {
  ActivationData,
  ChangePasswordData,
  EditProfileData,
  ForgotPasswordData,
  RegisterData,
  ResendActivationData,
  ResetPasswordData,
} from '@/types/user';

import request from '@/utils/request';

export const userApi = {
  // 註冊
  register(payload: RegisterData): Promise<ApiResult> {
    return request.post('/user/register/', payload);
  },

  // 帳戶激活
  activateAccount(payload: ActivationData): Promise<ApiResult> {
    return request.post('/user/activation/', payload);
  },

  // 重發激活郵件
  resendActivation(payload: ResendActivationData): Promise<ApiResult> {
    return request.post('/user/activation/resend/', payload);
  },

  // Password management
  // 要求重置密碼
  forgotPassword(payload: ForgotPasswordData): Promise<ApiResult> {
    return request.post('/user/reset-password/', payload);
  },

  // 重置密碼(忘記密碼)
  resetPassword(payload: ResetPasswordData): Promise<ApiResult> {
    return request.patch('/user/reset-password/confirm/', payload);
  },

  // 更改密碼(知道密碼)
  changePassword(payload: ChangePasswordData): Promise<ApiResult> {
    return request.put('/user/change-password/', payload);
  },

  // Profile management
  // 取得個人資料
  getUserProfile(): Promise<ApiResult> {
    return request.get('/user/profile');
  },

  // 更新個人資料
  updateUserProfile(payload: EditProfileData): Promise<ApiResult> {
    return request.put('/user/profile', payload);
  },

  // 刪除帳戶
  deleteUser(): Promise<ApiResult> {
    return request.delete('/user/me');
  },
};
