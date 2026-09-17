import { flushPromises } from '@vue/test-utils';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthentication } from '@/composables/useAuthentication';

const pushMock = vi.fn();

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: pushMock,
    replace: pushMock,
  }),
}));

const logoutMock = vi.fn();
vi.mock('@/services/auth', () => ({
  getAuthService: () => ({
    logout: logoutMock,
  }),
}));

describe('useAuthentication', () => {
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
    vi.clearAllMocks();
    // mock localStorage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = localStorageMock;
    localStorageMock.clear();
    logoutMock.mockImplementation(async () => {
      localStorageMock.clear();
    });
  });

  afterAll(() => {
    // 還原原本的 localStorage
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = originalLocalStorage;
  });

  it('provides default state and authentications list', () => {
    const { currentAuthentication, authentications } = useAuthentication();

    expect(currentAuthentication.value).toBe('');
    expect(authentications.map((a) => a.code)).toEqual(['user', 'logout']);
  });

  it('logoutAction calls AuthService.logout and clears auth state', async () => {
    localStorage.setItem('refresh_token', 'refresh123');
    localStorage.setItem('access_token', 'access123');
    localStorage.setItem('access_role', 'user');

    const { logoutAction } = useAuthentication();

    await logoutAction();
    await flushPromises();

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(localStorage.getItem('access_role')).toBeNull();
    expect(pushMock).toHaveBeenCalledWith({ name: 'login' });
  });

  it('logoutAction still redirects when AuthService.logout throws', async () => {
    localStorage.setItem('refresh_token', 'refresh123');

    logoutMock.mockImplementationOnce(async () => {
      localStorageMock.clear();
      throw new Error('network error');
    });

    const { logoutAction } = useAuthentication();

    await expect(logoutAction()).rejects.toThrow('network error');
    await flushPromises();

    expect(pushMock).toHaveBeenCalledWith({ name: 'login' });
    expect(localStorage.getItem('refresh_token')).toBeNull();
    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it('handleAuthenticationChange navigates to change-password on "user"', () => {
    const { handleAuthenticationChange } = useAuthentication();

    handleAuthenticationChange('user');

    expect(pushMock).toHaveBeenCalledWith({ name: 'change-password' });
  });

  it('handleAuthenticationChange triggers logout on "logout"', async () => {
    localStorage.setItem('refresh_token', 'refresh123');

    const { handleAuthenticationChange } = useAuthentication();

    handleAuthenticationChange('logout');
    await flushPromises();

    expect(logoutMock).toHaveBeenCalled();
  });
});
