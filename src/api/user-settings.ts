import type { ApiResponse } from '@/types/request';

import request from '@/utils/request';

export interface UserSettings {
  id?: string;
  lineNotifyToken: string | null;
  emailNotificationsEnabled: boolean;
  lineNotificationsEnabled: boolean;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export const userSettingsApi = {
  // 獲取用戶的通知設置
  getUserSettings: (): Promise<ApiResponse<UserSettings>> => {
    return request.get('/user-settings');
  },

  // 更新用戶的通知設置
  updateUserSettings: (settings: Partial<UserSettings>): Promise<ApiResponse<void>> => {
    return request.put('/user-settings', settings);
  },
};
