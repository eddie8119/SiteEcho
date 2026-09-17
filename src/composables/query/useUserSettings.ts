import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { type Ref } from 'vue';

import type { UserSettings } from '@/api/user-settings';

import { userSettingsApi } from '@/api/user-settings';

interface UseUserSettingsReturn {
  // 獲取用戶設置
  isLoadingSettings: Ref<boolean>;
  error: Ref<Error | null>;
  userSettings: Ref<UserSettings | undefined>;
  refetchSettings: () => Promise<void>;
  settingsUpdatedAt: Ref<number>;

  // 更新用戶設置
  updateSettings: (settings: Partial<UserSettings>) => Promise<boolean>;
  isUpdating: Ref<boolean>;
  updateError: Ref<Error | null>;
}

export function useUserSettings(): UseUserSettingsReturn {
  const queryClient = useQueryClient();

  // 獲取用戶設置
  const {
    data: userSettings,
    isLoading: isLoadingSettings,
    refetch: refetchQuerySettings,
    error,
    dataUpdatedAt: settingsUpdatedAt,
  } = useQuery({
    queryKey: ['user-settings'],
    queryFn: async () => {
      const response = await userSettingsApi.getUserSettings();
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5分鐘
    gcTime: 1000 * 60 * 10, // 10分鐘
  });

  // 更新用戶設置
  const {
    mutateAsync: mutateUpdateSettings,
    isPending: isUpdating,
    error: updateError,
  } = useMutation({
    mutationFn: async (settings: Partial<UserSettings>) => {
      const response = await userSettingsApi.updateUserSettings(settings);
      return response;
    },
    onSuccess: () => {
      // 更新成功後重新獲取設置
      queryClient.invalidateQueries({ queryKey: ['user-settings'] });
    },
  });

  // 重新獲取用戶設置
  const refetchSettings = async (): Promise<void> => {
    await refetchQuerySettings();
  };

  // 更新用戶設置
  const updateSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
    try {
      await mutateUpdateSettings(settings);
      return true;
    } catch (err) {
      console.error('更新用戶設置失敗:', err);
      return false;
    }
  };

  return {
    isLoadingSettings,
    error,
    userSettings,
    refetchSettings,
    settingsUpdatedAt,

    updateSettings,
    isUpdating,
    updateError,
  };
}
