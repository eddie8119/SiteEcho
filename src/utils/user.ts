import { jwtDecode } from 'jwt-decode';

import { getAccessToken } from './auth';

import { logError } from '@/utils/logger';

interface UserPayload {
  sub: string; // user ID
  email: string;
  role: string;
  exp: number;
  iat: number;
}

/**
 * 從 JWT token 中獲取當前用戶 ID
 * @returns 用戶 ID，如果無法獲取則返回 null
 */
export const getCurrentUserId = (): string | null => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    const decoded = jwtDecode<UserPayload>(token);
    return decoded.sub;
  } catch (error) {
    logError('Failed to decode token:', error, 'User');
    return null;
  }
};

/**
 * 從 JWT token 中獲取當前用戶資訊
 * @returns 用戶資訊，如果無法獲取則返回 null
 */
export const getCurrentUser = (): UserPayload | null => {
  const token = getAccessToken();
  if (!token) return null;

  try {
    return jwtDecode<UserPayload>(token);
  } catch (error) {
    logError('Failed to decode token:', error, 'User');
    return null;
  }
};
