/**
 * 用於管理用戶相關操作
 * 包含註冊、密碼管理、個人資料等功能
 *
 * @returns {Object}
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { type Ref, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ApiResponse, ApiResult } from '@/types/request';
import type {
  ActivationData,
  ChangePasswordData,
  EditProfileData,
  ForgotPasswordData,
  RegisterData,
  ResendActivationData,
  ResetPasswordData,
} from '@/types/user';
import type { AxiosError } from 'axios';

import { userApi } from '@/api/user';
import { useAuthStore } from '@/stores/useAuthStore';

interface UseUserReturn {
  // 獲取用戶資料
  userProfile: Ref<unknown>;
  isLoadingProfile: Ref<boolean>;
  profileError: Ref<Error | null>;
  refetchProfile: () => Promise<void>;

  // 註冊
  register: (data: RegisterData) => Promise<{ success: boolean; message?: string }>;
  isRegistering: Ref<boolean>;
  registerError: Ref<Error | null>;

  // 帳戶激活
  activateAccount: (data: ActivationData) => Promise<{ success: boolean; message?: string }>;
  isActivating: Ref<boolean>;
  activateError: Ref<Error | null>;

  // 重發激活郵件
  resendActivation: (data: ResendActivationData) => Promise<{ success: boolean; message?: string }>;
  isResending: Ref<boolean>;
  resendError: Ref<Error | null>;

  // 要求重置密碼
  forgotPassword: (data: ForgotPasswordData) => Promise<{ success: boolean; message?: string }>;
  isForgettingPassword: Ref<boolean>;
  forgotPasswordError: Ref<Error | null>;

  // 重置密碼
  resetPassword: (data: ResetPasswordData) => Promise<{ success: boolean; message?: string }>;
  isResettingPassword: Ref<boolean>;
  resetPasswordError: Ref<Error | null>;

  // 更改密碼
  changePassword: (data: ChangePasswordData) => Promise<{ success: boolean; message?: string }>;
  isChangingPassword: Ref<boolean>;
  changePasswordError: Ref<Error | null>;

  // 更新個人資料
  updateProfile: (data: EditProfileData) => Promise<{ success: boolean; message?: string }>;
  isUpdatingProfile: Ref<boolean>;
  updateProfileError: Ref<Error | null>;

  // 刪除帳戶
  deleteAccount: () => Promise<{ success: boolean; message?: string }>;
  isDeletingAccount: Ref<boolean>;
  deleteAccountError: Ref<Error | null>;
}

const QUERY_KEY = 'user';

export function useUser(): UseUserReturn {
  const authStore = useAuthStore();
  const { t } = useI18n();

  // 狀態追蹤
  const isRegistering = ref(false);
  const registerError = ref<Error | null>(null);
  const isActivating = ref(false);
  const activateError = ref<Error | null>(null);
  const isResending = ref(false);
  const resendError = ref<Error | null>(null);
  const isForgettingPassword = ref(false);
  const forgotPasswordError = ref<Error | null>(null);
  const isResettingPassword = ref(false);
  const resetPasswordError = ref<Error | null>(null);
  const isChangingPassword = ref(false);
  const changePasswordError = ref<Error | null>(null);
  const isUpdatingProfile = ref(false);
  const updateProfileError = ref<Error | null>(null);
  const isDeletingAccount = ref(false);
  const deleteAccountError = ref<Error | null>(null);

  const queryClient = useQueryClient();

  // 獲取用戶資料
  const {
    data: userProfile,
    isLoading: isLoadingProfile,
    refetch: refetchQueryProfile,
    error: profileError,
  } = useQuery({
    queryKey: [QUERY_KEY, 'profile'],
    queryFn: async () => {
      const response = await userApi.getUserProfile();
      return response.data;
    },
    enabled: authStore.isAuthenticated, // 未登入不發送請求
    staleTime: 1000 * 60 * 5, // 5分鐘
    gcTime: 1000 * 60 * 10, // 10分鐘
  });

  // 重新獲取用戶資料
  const refetchProfile = async (): Promise<void> => {
    await refetchQueryProfile();
  };

  // ==================== 註冊 ====================
  const { mutateAsync: mutateRegister } = useMutation({
    mutationFn: async (data: RegisterData) => {
      const response = await userApi.register(data);
      return response;
    },
    retry: false,
  });

  const register = async (data: RegisterData): Promise<ApiResult> => {
    try {
      isRegistering.value = true;
      registerError.value = null;

      const result = await mutateRegister(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      registerError.value = err instanceof Error ? err : new Error(String(err));
      console.error('註冊失敗:', err);

      // 白名單
      const axiosError = err as AxiosError<ApiResponse<unknown> | undefined>;
      const status = axiosError.response?.status;

      if (status === 403) {
        const message = (axiosError.response?.data as { message?: string } | undefined)?.message;
        return {
          success: false,
          message: message || t('message.error.register'),
        };
      }

      return { success: false, message: t('message.error.register') };
    } finally {
      isRegistering.value = false;
    }
  };

  // ==================== 帳戶激活 ====================
  const { mutateAsync: mutateActivate } = useMutation({
    mutationFn: async (data: ActivationData) => {
      const response = await userApi.activateAccount(data);
      return response;
    },
  });

  const activateAccount = async (data: ActivationData): Promise<ApiResult> => {
    try {
      isActivating.value = true;
      activateError.value = null;

      const result = await mutateActivate(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      activateError.value = err instanceof Error ? err : new Error(String(err));
      console.error('帳戶激活失敗:', err);
      return { success: false, message: t('message.error.activate_account') };
    } finally {
      isActivating.value = false;
    }
  };

  // ==================== 重發激活郵件 ====================
  const { mutateAsync: mutateResend } = useMutation({
    mutationFn: async (data: ResendActivationData) => {
      const response = await userApi.resendActivation(data);
      return response;
    },
  });

  const resendActivation = async (data: ResendActivationData): Promise<ApiResult> => {
    try {
      isResending.value = true;
      resendError.value = null;

      const result = await mutateResend(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      resendError.value = err instanceof Error ? err : new Error(String(err));
      console.error('重發激活郵件失敗:', err);
      return { success: false, message: t('message.error.resend_activation') };
    } finally {
      isResending.value = false;
    }
  };

  // ==================== 要求重置密碼 ====================
  const { mutateAsync: mutateForgotPassword } = useMutation({
    mutationFn: async (data: ForgotPasswordData) => {
      const response = await userApi.forgotPassword(data);
      return response;
    },
  });

  const forgotPassword = async (data: ForgotPasswordData): Promise<ApiResult> => {
    try {
      isForgettingPassword.value = true;
      forgotPasswordError.value = null;

      const result = await mutateForgotPassword(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      forgotPasswordError.value = err instanceof Error ? err : new Error(String(err));
      console.error('要求重置密碼失敗:', err);
      return { success: false, message: t('message.error.change_password') };
    } finally {
      isForgettingPassword.value = false;
    }
  };

  // ==================== 重置密碼 ====================
  const { mutateAsync: mutateResetPassword } = useMutation({
    mutationFn: async (data: ResetPasswordData) => {
      const response = await userApi.resetPassword(data);
      return response;
    },
  });

  const resetPassword = async (data: ResetPasswordData): Promise<ApiResult> => {
    try {
      isResettingPassword.value = true;
      resetPasswordError.value = null;

      const result = await mutateResetPassword(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      resetPasswordError.value = err instanceof Error ? err : new Error(String(err));
      console.error('重置密碼失敗:', err);
      return { success: false, message: t('message.error.change_password') };
    } finally {
      isResettingPassword.value = false;
    }
  };

  // ==================== 更改密碼 ====================
  const { mutateAsync: mutateChangePassword } = useMutation({
    mutationFn: async (data: ChangePasswordData) => {
      const response = await userApi.changePassword(data);
      return response;
    },
  });

  const changePassword = async (data: ChangePasswordData): Promise<ApiResult> => {
    try {
      isChangingPassword.value = true;
      changePasswordError.value = null;

      const result = await mutateChangePassword(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      changePasswordError.value = err instanceof Error ? err : new Error(String(err));
      console.error('更改密碼失敗:', err);
      return { success: false, message: t('message.error.change_password') };
    } finally {
      isChangingPassword.value = false;
    }
  };

  // ==================== 更新個人資料 ====================
  const { mutateAsync: mutateUpdateProfile } = useMutation({
    mutationFn: async (data: EditProfileData) => {
      const response = await userApi.updateUserProfile(data);
      return response;
    },
    onSuccess: () => {
      // 更新成功後重新獲取用戶資料
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY, 'profile'] });
    },
  });

  const updateProfile = async (data: EditProfileData): Promise<ApiResult> => {
    try {
      isUpdatingProfile.value = true;
      updateProfileError.value = null;

      const result = await mutateUpdateProfile(data);
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      updateProfileError.value = err instanceof Error ? err : new Error(String(err));
      console.error('更新個人資料失敗:', err);
      return { success: false, message: t('message.error.update') };
    } finally {
      isUpdatingProfile.value = false;
    }
  };

  // ==================== 刪除帳戶 ====================
  const { mutateAsync: mutateDeleteAccount } = useMutation({
    mutationFn: async () => {
      const response = await userApi.deleteUser();
      return response;
    },
  });

  const deleteAccount = async (): Promise<ApiResult> => {
    try {
      isDeletingAccount.value = true;
      deleteAccountError.value = null;

      const result = await mutateDeleteAccount();
      return result as unknown as ApiResult;
    } catch (err: unknown) {
      deleteAccountError.value = err instanceof Error ? err : new Error(String(err));
      console.error('刪除帳戶失敗:', err);
      return { success: false, message: t('message.deleteAccount.deleteFailed') };
    } finally {
      isDeletingAccount.value = false;
    }
  };

  return {
    // 獲取用戶資料
    userProfile: userProfile as Ref<unknown>,
    isLoadingProfile,
    profileError,
    refetchProfile,
    // 註冊
    register,
    isRegistering,
    registerError,
    // 帳戶激活
    activateAccount,
    isActivating,
    activateError,
    // 重發激活郵件
    resendActivation,
    isResending,
    resendError,
    // 要求重置密碼
    forgotPassword,
    isForgettingPassword,
    forgotPasswordError,
    // 重置密碼
    resetPassword,
    isResettingPassword,
    resetPasswordError,
    // 更改密碼
    changePassword,
    isChangingPassword,
    changePasswordError,
    // 更新個人資料
    updateProfile,
    isUpdatingProfile,
    updateProfileError,
    // 刪除帳戶
    deleteAccount,
    isDeletingAccount,
    deleteAccountError,
  };
}
