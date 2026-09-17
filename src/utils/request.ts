/// <reference types="vite/client" />
import axios, { type AxiosRequestConfig, isAxiosError } from 'axios';

import router from '@/router';
import { getAuthService } from '@/services/auth';
import { getAccessToken, getRefreshToken, isAccessTokenValid } from '@/utils/auth';
import { LOGIN_REQUIRED_MESSAGE_KEY, promptLoginRequired } from '@/utils/authPrompt';
import { logError } from '@/utils/logger';

interface CustomAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// 登出並清理（與 auth store 同步）
const logout = async () => {
  await getAuthService().logout();

  const currentRoute = router.currentRoute.value;

  // 如果目前路由 path 以 /auth 開頭則不執行 router.replace
  if (currentRoute.path.startsWith('/auth')) {
    return;
  }

  const redirectTarget = currentRoute.fullPath || currentRoute.path || '/';

  await promptLoginRequired({
    messageKey: LOGIN_REQUIRED_MESSAGE_KEY,
    onAfterPrompt: () => {
      void router.replace({ name: 'login', query: { redirect: redirectTarget } });
    },
  });
};

// ========== Axios Instances ==========
const baseURL = import.meta.env.VITE_API_URL;

const instance = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttprequest',
  },
});

// ========== Token Refresh Queue ==========
let isRefreshing = false; // 標記是否正在刷新 token
let refreshSubscribers: ((token: string) => void)[] = [];

// 機制確保了只會有第一個人去拿鑰匙（刷新 token），其他人則原地等待
// 不會自己也跑去櫃檯，而是在門口排隊，並把自己的聯絡方式（一個回呼函式）留給門口的服務生
const subscribeTokenRefresh = (cb: (token: string) => void) => {
  refreshSubscribers.push(cb);
};

// 把新鑰匙逐一發給正在排隊的請求
const onTokenRefreshed = (token: string) => {
  // cb 就是那個等待中的函式 (newToken) => { ... }
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
};

// ========== Request Interceptor ==========
instance.interceptors.request.use(
  async (config) => {
    const token = getAccessToken();

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 預先檢查並刷新過期的 token（在請求發送前）
instance.interceptors.request.use(
  async (config) => {
    const refreshToken = getRefreshToken();

    if (!isAccessTokenValid() && refreshToken) {
      try {
        if (!isRefreshing) {
          isRefreshing = true;

          const authService = getAuthService();
          const newAccessToken = await authService.refreshSession();

          if (newAccessToken) {
            onTokenRefreshed(newAccessToken);

            // 更新當前請求的 token
            config.headers.Authorization = `Bearer ${newAccessToken}`;
          }

          isRefreshing = false;
        }
      } catch {
        isRefreshing = false;
        // 刷新失敗，讓響應攔截器處理 401
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

const shouldBypassRefresh = (url?: string) => {
  if (!url) return false;
  const tryNormalizePath = (rawUrl: string) => {
    try {
      const parsed = new URL(rawUrl, baseURL);
      return parsed.pathname;
    } catch {
      return rawUrl;
    }
  };

  const path = tryNormalizePath(url);
  const bypassList = ['/auth/login', '/auth/logout', '/auth/sso', '/auth/token/refresh'];
  return bypassList.some((endpoint) => path.includes(endpoint));
};

instance.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;
    const currentAccessToken = getAccessToken();
    const currentRefreshToken = getRefreshToken();

    const isAuthEndpoint = shouldBypassRefresh(originalRequest?.url);

    // 如果是 401 錯誤且不是刷新 token 的請求
    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      logError(
        '[Auth 401]',
        {
          url: originalRequest?.url,
          response: error.response?.data,
          accessTokenExists: !!currentAccessToken,
          refreshTokenExists: !!currentRefreshToken,
        },
        'Auth'
      );

      if (!isRefreshing) {
        isRefreshing = true;
        originalRequest._retry = true;

        try {
          if (!currentRefreshToken) {
            logError(
              '[Auth] Logging out because refresh token is missing',
              {
                url: originalRequest?.url,
              },
              'Auth'
            );
            await logout();
            throw new Error('No refresh token');
          }

          const authService = getAuthService();
          const newAccessToken = await authService.refreshSession();

          if (!newAccessToken) {
            throw new Error('Refresh session returned null');
          }

          // 當第一個請求（請求 A）成功拿到新的 access token 後
          onTokenRefreshed(newAccessToken);
          // 用新鑰匙開門的動作
          return instance(originalRequest);
        } catch (refreshError: unknown) {
          // 當 refresh token 也過期時，後端會回傳 401
          if (isAxiosError(refreshError) && refreshError.response?.status === 401) {
            logError(
              '[Auth] Logging out because refresh failed',
              {
                url: originalRequest?.url,
                refreshError,
              },
              'Auth'
            );
            await logout();
          } else {
            logError('Unable to refresh token for other reasons:', refreshError, 'Auth');
          }
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      }

      // 這樣可以確保所有請求都使用同一個 token，避免多個請求使用不同 token 的問題
      return new Promise((resolve) => {
        // 如果正在刷新 token，將請求暫存起來
        // 這就是「留下聯絡方式」。它把一個函式（一個箭頭函式）放進 refreshSubscribers 這個「排隊列表」中。這個函式知道兩件事：
        subscribeTokenRefresh((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          resolve(instance(originalRequest));
        });
      });
    }

    // 將後端錯誤格式直接回傳給呼叫端（統一為 ApiResponse 風格）
    if (error.response?.data) {
      return error.response.data;
    }

    logError(
      '[Network Error]',
      {
        url: originalRequest?.url,
        baseURL: originalRequest?.baseURL ?? baseURL,
        message: error.message,
        code: error.code,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : undefined,
      },
      'Network'
    );

    return Promise.reject(error);
  }
);

export default instance;

// 攔截器流程說明:
// 第一個請求攔截器：為每個請求從 localStorage 讀取最新的 token 並放入 header
// 第二個請求攔截器：預先檢查 token 有效性，如果 access token 過期但 refresh token 有效，主動刷新
// 響應攔截器：處理 API 回應，特別是 401 錯誤，並觸發 token 刷新流程（作為備用機制）
