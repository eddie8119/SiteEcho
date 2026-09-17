import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { useMutation } from '@tanstack/vue-query';
import { type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { SsoProvider } from '@/constants/provider';
import type { ApiResponse } from '@/types/request';
import type { AuthResponse } from '@/types/response';
import type { LoginData } from '@/types/user';

import { authApi } from '@/api/auth';
import { supabase } from '@/lib/supabase';

interface UseAuthReturn {
  // 登入
  login: (data: LoginData) => Promise<ApiResponse<AuthResponse>>;
  isLoggingIn: Ref<boolean>;
  loginError: Ref<Error | null>;
  // SSO 登入
  ssoLogin: (provider: SsoProvider) => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const { t } = useI18n();

  // ==================== 登入 ====================
  const {
    mutateAsync: mutateLogin,
    isPending: isLoggingIn,
    error: loginError,
  } = useMutation({
    mutationFn: async (data: LoginData) => {
      const response = await authApi.login(data);
      return response;
    },
    retry: false, // 不自動重試
  });

  const login = async (data: LoginData): Promise<ApiResponse<AuthResponse>> => {
    try {
      const result = (await mutateLogin(data)) as ApiResponse<AuthResponse>;
      if (!result.success) {
        return {
          success: false,
          data: result.data,
          message: result.code ?? result.message,
        };
      }
      return result;
    } catch (err: unknown) {
      return { success: false, message: t('message.error.login') };
    }
  };

  // ==================== SSO 登入 ====================
  const ssoLogin = async (provider: SsoProvider): Promise<void> => {
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Capacitor App：使用 deep link 作為回調，確保 code_verifier 在同一 storage 中
      const redirectTo = 'SiteNear://auth/sso/callback';

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('無法取得 OAuth 登入網址');
      }

      await Browser.open({ url: data.url });
    } else {
      // Web/PWA 流程：直接使用前端 Supabase Client 發起 OAuth
      const redirectTo = `${window.location.origin}/auth/sso/callback`;

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider as 'google' | 'apple',
        options: {
          redirectTo,
          skipBrowserRedirect: false, // Web 模式讓 Supabase 自動處理重定向
        },
      });

      if (error) {
        throw error;
      }

      if (!data.url) {
        throw new Error('無法取得 OAuth 登入網址');
      }

      window.location.href = data.url;
    }
  };

  return {
    // 登入
    login,
    isLoggingIn,
    loginError,
    // SSO 登入
    ssoLogin,
  };
}
