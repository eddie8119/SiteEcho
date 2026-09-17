import { defineStore } from 'pinia';

import { clearAllTokens, clearTokens, isAccessTokenValid } from '@/utils/auth';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    isAuthenticated: false,
    role: null as 'admin' | 'user' | null,
    pendingActivationEmail: null as string | null,
  }),

  actions: {
    setAuth(status: boolean) {
      this.isAuthenticated = status;
    },

    setUser(role: 'admin' | 'user' | null) {
      this.role = role;
    },

    setPendingActivationEmail(email: string | null) {
      this.pendingActivationEmail = email;
    },

    /**
     * 重置認證狀態
     * @param allDevices - 是否同時登出所有設備（PWA + Web），預設為 false
     */
    resetAuthState(allDevices = false) {
      this.setAuth(false);
      this.setUser(null);
      this.setPendingActivationEmail(null);
      if (allDevices) {
        clearAllTokens();
      } else {
        clearTokens();
      }
    },

    /**
     * 初始化認證狀態，驗證 token 有效性
     * 如果 token 無效或過期，自動清理並登出
     */
    initializeAuthState() {
      // 檢查 access token 是否存在且有效
      if (isAccessTokenValid()) {
        this.isAuthenticated = true;
      } else {
        // Token 不存在或已過期，清理狀態
        this.resetAuthState();
      }
    },

    // 登入成功時呼叫
    login(role: 'admin' | 'user') {
      this.setAuth(true);
      this.setUser(role);
    },

    /**
     * 登出
     * @param allDevices - 是否同時登出所有設備（PWA + Web），預設為 false
     */
    logout(allDevices = false) {
      this.resetAuthState(allDevices);
    },
  },
});

// token 存在 store 中
// 安全 JWT Token 本身是設計來放在前端

// 用 jwtDecode 解析而不在 store 存 token 是比較好的做法
// 安全性：
// token 只存在 localStorage，減少暴露在記憶體中的時間
// 需要時才解析，不會持續存在記憶體中
// 狀態管理：
// 單一數據來源：token 只存在 localStorage 一個地方
// 避免同步問題：不用擔心 store 和 localStorage 的 token 不一致
// 效能：
// 減少記憶體使用：不需要在 store 中保存重複的數據
// 按需解析：只在需要時才解析 token
// 維護性：
// 程式碼更清晰：token 的存取都通過特定方法
