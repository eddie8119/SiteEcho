import { AuthService } from './AuthService';

let authService: AuthService | null = null;

export function initializeAuthService(pinia: import('pinia').Pinia): AuthService {
  authService = new AuthService(pinia);
  return authService;
}

export function getAuthService(): AuthService {
  if (!authService) {
    throw new Error('AuthService 尚未初始化');
  }

  return authService;
}
