import { jwtDecode } from 'jwt-decode';

import { detectDevice } from './deviceDetector';

import { logError } from '@/utils/logger';

// ========== Environment Detection ==========
/**
 * 檢測當前是否為 PWA 模式
 */
export const isPWA = (): boolean => {
  return detectDevice().isPWA;
};

/**
 * 獲取當前環境的 storage key 前綴
 * PWA 和 Web 使用不同的 key，實現登入狀態分離
 */
const getStoragePrefix = (): string => {
  return isPWA() ? 'pwa_' : 'web_';
};

// ========== Token Utilities ==========
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_ROLE_KEY = 'access_role';

const getAccessTokenKey = () => `${getStoragePrefix()}${ACCESS_TOKEN_KEY}`;
const getRefreshTokenKey = () => `${getStoragePrefix()}${REFRESH_TOKEN_KEY}`;
const getAccessRoleKey = () => `${getStoragePrefix()}${ACCESS_ROLE_KEY}`;

export const getAccessToken = () => localStorage.getItem(getAccessTokenKey());
export const getRefreshToken = () => localStorage.getItem(getRefreshTokenKey());

export const setAccessToken = (token: string) => {
  localStorage.setItem(getAccessTokenKey(), token);
};
export const setRefreshToken = (token: string) => {
  localStorage.setItem(getRefreshTokenKey(), token);
};

/**
 * 清除當前環境的 tokens（PWA 或 Web）
 */
export const clearTokens = () => {
  localStorage.removeItem(getAccessTokenKey());
  localStorage.removeItem(getRefreshTokenKey());
  localStorage.removeItem(getAccessRoleKey());
};

/**
 * 清除所有環境的 tokens（PWA + Web）
 * 用於完全登出所有設備
 */
export const clearAllTokens = () => {
  // PWA tokens
  localStorage.removeItem(`pwa_${ACCESS_TOKEN_KEY}`);
  localStorage.removeItem(`pwa_${REFRESH_TOKEN_KEY}`);
  localStorage.removeItem(`pwa_${ACCESS_ROLE_KEY}`);
  // Web tokens
  localStorage.removeItem(`web_${ACCESS_TOKEN_KEY}`);
  localStorage.removeItem(`web_${REFRESH_TOKEN_KEY}`);
  localStorage.removeItem(`web_${ACCESS_ROLE_KEY}`);
};

// ========== Token Validation ==========
interface JWTPayload {
  exp: number;
  iat?: number;
  [key: string]: unknown;
}

/**
 * 檢查 token 是否過期
 * @param token JWT token
 * @returns true 表示 token 有效，false 表示過期或無效
 */
export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;

  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const currentTime = Date.now() / 1000; // 轉換為秒

    // 檢查 token 是否過期（留 10 秒緩衝時間）
    return decoded.exp > currentTime + 10;
  } catch (error) {
    logError('Token validation failed:', error, 'Auth');
    return false;
  }
};

// 檢查當前的 access token 是否有效
export const isAccessTokenValid = (): boolean => {
  const token = getAccessToken();
  return isTokenValid(token);
};

// 檢查當前的 refresh token 是否存在
// refresh token 通常是 opaque token，不應以 JWT 方式解碼驗證
export const isRefreshTokenValid = (): boolean => {
  return !!getRefreshToken();
};

// ========== Role Utilities ==========
export const getAccessRole = () => localStorage.getItem(getAccessRoleKey());
export const setAccessRole = (role: string) => localStorage.setItem(getAccessRoleKey(), role);
export const isAdmin = () => getAccessRole() === 'admin';
