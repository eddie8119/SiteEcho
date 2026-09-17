import { clearAuthSource, getAuthSource, setAuthSource } from './authStorage';

import type { AuthRole } from './auth.types';

import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  clearTokens,
  getAccessRole,
  getAccessToken,
  getRefreshToken,
  setAccessRole,
  setAccessToken,
  setRefreshToken,
} from '@/utils/auth';
import { logWarn } from '@/utils/logger';

export class AuthService {
  private supabaseSubscription?: {
    unsubscribe: () => void;
  };

  constructor(private readonly pinia: import('pinia').Pinia) {}

  private get authStore() {
    return useAuthStore(this.pinia);
  }

  applySession(payload: import('./auth.types').AuthSessionPayload): void {
    setAccessToken(payload.accessToken);

    if (payload.refreshToken) {
      setRefreshToken(payload.refreshToken);
    }

    const role = payload.role ?? 'user';

    setAccessRole(role);
    setAuthSource(payload.source);
    this.authStore.login(role);
  }

  async exchangeOAuthCode(code: string): Promise<import('@supabase/supabase-js').Session> {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    if (!data.session) {
      throw new Error('OAuth 完成，但沒有取得 Session');
    }

    return data.session;
  }

  async initialize(): Promise<void> {
    this.initializeSupabaseSessionListener();

    const source = getAuthSource();
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();
    const role = getAccessRole();

    if (source === 'supabase') {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      if (data.session) {
        this.applySession({
          accessToken: data.session.access_token,
          refreshToken: data.session.refresh_token,
          role: 'user',
          source: 'supabase',
        });

        return;
      }

      this.clearLocalSession();
      return;
    }

    if (
      source === 'backend' &&
      accessToken &&
      refreshToken &&
      (role === 'admin' || role === 'user')
    ) {
      this.authStore.login(role);
      return;
    }

    if (source || accessToken || role) {
      this.clearLocalSession();
    }
  }

  async refreshSession(): Promise<string | null> {
    const source = getAuthSource();

    if (source === 'supabase') {
      return this.refreshSupabaseSession();
    }

    if (source === 'backend') {
      return this.refreshBackendSession();
    }

    return null;
  }

  async logout(options: import('./auth.types').LogoutOptions = {}): Promise<void> {
    const source = getAuthSource();

    try {
      if (source === 'supabase' && options.revokeRemote !== false) {
        try {
          await supabase.auth.signOut({
            scope: options.allDevices ? 'global' : 'local',
          });
        } catch (error) {
          logWarn('Supabase signOut failed', error, 'AuthService');
        }
      }

      if (source === 'backend' && options.revokeRemote !== false) {
        await this.logoutBackendSession();
      }
    } finally {
      this.clearLocalSession();
    }
  }

  private clearLocalSession(): void {
    clearTokens();
    clearAuthSource();
    this.authStore.logout();
    this.clearSupabaseSession();
  }

  private clearSupabaseSession(): void {
    if (typeof localStorage === 'undefined') return;

    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        key.startsWith('sb-') &&
        (key.endsWith('-auth-token') || key.endsWith('-auth-token-code-verifier'))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  private async refreshSupabaseSession(): Promise<string | null> {
    const { data, error } = await supabase.auth.refreshSession();

    if (error) {
      throw error;
    }

    if (!data.session) {
      return null;
    }

    this.applySession({
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      role: 'user',
      source: 'supabase',
    });

    return data.session.access_token;
  }

  private async refreshBackendSession(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    const role: AuthRole = getAccessRole() === 'admin' ? 'admin' : 'user';

    if (!refreshToken) {
      return null;
    }

    const baseURL = import.meta.env.VITE_API_URL;

    try {
      const response = await fetch(`${baseURL}/auth/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend refresh failed: ${response.status}`);
      }

      const data = await response.json();
      const { access_token, refresh_token: new_refresh_token } = data;

      this.applySession({
        accessToken: access_token,
        refreshToken: new_refresh_token || refreshToken,
        role,
        source: 'backend',
      });

      return access_token;
    } catch (error) {
      logWarn('Backend session refresh failed', error, 'AuthService');
      throw error;
    }
  }

  private async logoutBackendSession(): Promise<void> {
    const refreshToken = getRefreshToken();

    if (!refreshToken) {
      return;
    }

    const baseURL = import.meta.env.VITE_API_URL;

    try {
      const response = await fetch(`${baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken,
        }),
      });

      if (!response.ok) {
        logWarn(
          'Backend logout request failed',
          {
            status: response.status,
          },
          'AuthService'
        );
      }
    } catch (error) {
      logWarn('Backend logout failed', error, 'AuthService');
    }
  }

  dispose(): void {
    this.supabaseSubscription?.unsubscribe();
  }

  private initializeSupabaseSessionListener(): void {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      const source = getAuthSource();

      if (source !== 'supabase') {
        return;
      }

      if (
        session &&
        (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION')
      ) {
        this.applySession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          role: 'user',
          source: 'supabase',
        });

        return;
      }

      if (event === 'SIGNED_OUT') {
        this.clearLocalSession();
      }
    });

    this.supabaseSubscription = data.subscription;
  }
}
