import { createPinia, setActivePinia } from 'pinia';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../AuthService';
import { getAuthSource, setAuthSource } from '../authStorage';

import { useAuthStore } from '@/stores/useAuthStore';
import * as authUtils from '@/utils/auth';
import {
  getAccessRole,
  getAccessToken,
  getRefreshToken,
  setAccessRole,
  setAccessToken,
  setRefreshToken,
} from '@/utils/auth';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('@/utils/deviceDetector', () => ({
  detectDevice: vi.fn(() => ({ isPWA: false })),
}));

vi.mock('@/utils/logger', () => ({
  logError: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

describe('AuthService', () => {
  const originalLocalStorage = global.localStorage;
  const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
    };
  })();

  beforeEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStorageMock;
    localStorageMock.clear();
    setActivePinia(createPinia());
  });

  it('applySession stores tokens, auth source, and logs the user into Pinia', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    authService.applySession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      role: 'admin',
      source: 'backend',
    });

    expect(getAccessToken()).toBe('access-token');
    expect(getRefreshToken()).toBe('refresh-token');
    expect(getAccessRole()).toBe('admin');
    expect(getAuthSource()).toBe('backend');
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.role).toBe('admin');
  });

  it('applySession supports missing refresh token and defaults role to user', () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    authService.applySession({
      accessToken: 'access-token',
      refreshToken: null,
      source: 'supabase',
    });

    expect(getAccessToken()).toBe('access-token');
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBe('user');
    expect(getAuthSource()).toBe('supabase');
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.role).toBe('user');
  });

  it('refreshSession preserves existing role when refreshing backend tokens', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    authService.applySession({
      accessToken: 'old-access-token',
      refreshToken: 'old-refresh-token',
      role: 'user',
      source: 'backend',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
      }),
    });

    vi.stubGlobal('fetch', fetchMock);

    const accessToken = await authService.refreshSession();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/token/refresh/'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refresh_token: 'old-refresh-token',
        }),
      })
    );
    expect(accessToken).toBe('new-access-token');
    expect(getAccessToken()).toBe('new-access-token');
    expect(getRefreshToken()).toBe('new-refresh-token');
    expect(getAccessRole()).toBe('user');
    expect(authStore.role).toBe('user');

    vi.unstubAllGlobals();
  });

  it('initialize restores backend auth state from local storage', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    setAccessToken('backend-access-token');
    setRefreshToken('backend-refresh-token');
    setAccessRole('admin');
    setAuthSource('backend');

    const unsubscribe = vi.fn();
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as never);
    vi.spyOn(authUtils, 'isAccessTokenValid').mockReturnValue(false);
    vi.spyOn(authUtils, 'isRefreshTokenValid').mockReturnValue(true);

    await authService.initialize();

    expect(supabase.auth.onAuthStateChange).toHaveBeenCalledTimes(1);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.role).toBe('admin');
    expect(getAuthSource()).toBe('backend');
    expect(getAccessToken()).toBe('backend-access-token');
    expect(getRefreshToken()).toBe('backend-refresh-token');
    expect(getAccessRole()).toBe('admin');
  });

  it('initialize restores Supabase auth state from getSession', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    setAuthSource('supabase');

    const unsubscribe = vi.fn();
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as never);
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: {
        session: {
          access_token: 'supabase-access-token',
          refresh_token: 'supabase-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-id',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    await authService.initialize();

    expect(supabase.auth.getSession).toHaveBeenCalledTimes(1);
    expect(authStore.isAuthenticated).toBe(true);
    expect(authStore.role).toBe('user');
    expect(getAuthSource()).toBe('supabase');
    expect(getAccessToken()).toBe('supabase-access-token');
    expect(getRefreshToken()).toBe('supabase-refresh-token');
    expect(getAccessRole()).toBe('user');
  });

  it('initialize clears stale auth state when backend refresh token is missing', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    setAccessToken('expired-access-token');
    setAccessRole('user');
    setAuthSource('backend');

    const unsubscribe = vi.fn();
    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe } },
    } as never);

    vi.spyOn(authUtils, 'isAccessTokenValid').mockReturnValue(false);

    await authService.initialize();

    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.role).toBeNull();
    expect(getAuthSource()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();
  });

  it('logout revokes backend session and clears local auth state', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    authService.applySession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      role: 'user',
      source: 'backend',
    });

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });

    vi.stubGlobal('fetch', fetchMock);

    await authService.logout();

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/auth/logout'),
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: 'refresh-token',
        }),
      })
    );
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();
    expect(getAuthSource()).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.role).toBeNull();

    vi.unstubAllGlobals();
  });

  it('logout calls Supabase signOut and clears local auth state', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const authStore = useAuthStore(pinia);

    authService.applySession({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      role: 'user',
      source: 'supabase',
    });

    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.signOut).mockResolvedValue({ error: null });

    await authService.logout({ allDevices: true });

    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'global' });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();
    expect(getAuthSource()).toBeNull();
    expect(authStore.isAuthenticated).toBe(false);
    expect(authStore.role).toBeNull();
  });

  it('exchangeOAuthCode returns the session from Supabase', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    const exchangeCodeForSession = vi.fn().mockResolvedValue({
      data: {
        session: {
          access_token: 'oauth-access-token',
          refresh_token: 'oauth-refresh-token',
          expires_in: 3600,
          token_type: 'bearer',
          user: {
            id: 'user-id',
            email: 'test@example.com',
            aud: 'authenticated',
            role: 'authenticated',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
            app_metadata: {},
            user_metadata: {},
          },
        },
      },
      error: null,
    });

    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.exchangeCodeForSession).mockImplementation(exchangeCodeForSession);

    const session = await authService.exchangeOAuthCode('oauth-code');

    expect(exchangeCodeForSession).toHaveBeenCalledWith('oauth-code');
    expect(session.access_token).toBe('oauth-access-token');
    expect(session.refresh_token).toBe('oauth-refresh-token');
  });

  it('exchangeOAuthCode throws Supabase errors', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const authService = new AuthService(pinia);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exchangeError: any = {
      name: 'AuthError',
      message: 'exchange failed',
      code: 'exchange_failed',
      status: 400,
      __isAuthError: true,
      toJSON: () => ({ message: 'exchange failed', code: 'exchange_failed', status: 400 }),
    };

    const { supabase } = await import('@/lib/supabase');
    vi.mocked(supabase.auth.exchangeCodeForSession).mockResolvedValue({
      data: { user: null, session: null },
      error: exchangeError,
    });

    await expect(authService.exchangeOAuthCode('oauth-code')).rejects.toThrow('exchange failed');
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = originalLocalStorage;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });
});
