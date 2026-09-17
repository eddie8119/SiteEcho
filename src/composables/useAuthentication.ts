/**
 * 用於提供身份驗證相關功能，包括登出和個人資料重置。
 * 管理身份驗證下拉選單的狀態和操作。
 *
 * @returns {Object}
 * @returns {Ref<string>} currentAuthentication - 當前選中的身份驗證選項
 * @returns {AuthenticationItem[]} authentications - 可用的身份驗證選項列表
 * @returns {Function} handleAuthenticationChange - 處理身份驗證選項變更
 */

import { ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import { getAuthService } from '@/services/auth';

interface AuthenticationItem {
  code: string;
  label: string;
  action: () => void;
}

interface UseAuthenticationReturn {
  currentAuthentication: Ref<string>;
  authentications: AuthenticationItem[];
  handleAuthenticationChange: (value: string) => void;
  logoutAction: () => void;
}

export const useAuthentication = (): UseAuthenticationReturn => {
  const currentAuthentication = ref<string>('');

  const router = useRouter();

  const resetProfileAction = () => {
    router.push({ name: 'change-password' });
  };

  const logoutAction = async () => {
    const authService = getAuthService();

    try {
      await authService.logout();
    } finally {
      router.replace({ name: 'login' });
    }
  };

  const authentications: AuthenticationItem[] = [
    { code: 'user', label: 'user', action: resetProfileAction },
    { code: 'logout', label: 'logout', action: logoutAction },
  ];

  const handleAuthenticationChange = (value: string) => {
    if (value === 'user') resetProfileAction();
    if (value === 'logout') logoutAction();
  };

  return {
    currentAuthentication,
    authentications,
    handleAuthenticationChange,
    logoutAction,
  };
};
