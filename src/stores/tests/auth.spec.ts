import { createPinia, setActivePinia } from 'pinia';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/auth', () => {
  return {
    clearTokens: vi.fn(),
    isAccessTokenValid: vi.fn(),
  };
});

import { useAuthStore } from '../useAuthStore';

import { clearTokens, isAccessTokenValid } from '@/utils/auth';

const mockClearTokens = clearTokens as unknown as ReturnType<typeof vi.fn>;
const mockIsAccessTokenValid = isAccessTokenValid as unknown as ReturnType<typeof vi.fn>;

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it('sets auth status and role correctly', () => {
    const store = useAuthStore();

    store.setAuth(true);
    store.setUser('admin');

    expect(store.isAuthenticated).toBe(true);
    expect(store.role).toBe('admin');
  });

  it('resetAuthState clears auth state and calls clearTokens', () => {
    const store = useAuthStore();

    store.setAuth(true);
    store.setUser('user');
    store.setPendingActivationEmail('test@example.com');

    store.resetAuthState();

    expect(store.isAuthenticated).toBe(false);
    expect(store.role).toBeNull();
    expect(store.pendingActivationEmail).toBeNull();
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it('initializeAuthState sets isAuthenticated when token is valid', () => {
    const store = useAuthStore();

    mockIsAccessTokenValid.mockReturnValue(true);

    store.initializeAuthState();

    expect(mockIsAccessTokenValid).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated).toBe(true);
  });

  it('initializeAuthState resets auth state when token is invalid', () => {
    const store = useAuthStore();

    store.setAuth(true);
    store.setUser('admin');

    mockIsAccessTokenValid.mockReturnValue(false);

    store.initializeAuthState();

    expect(mockIsAccessTokenValid).toHaveBeenCalledTimes(1);
    expect(store.isAuthenticated).toBe(false);
    expect(store.role).toBeNull();
    expect(mockClearTokens).toHaveBeenCalledTimes(1);
  });

  it('login sets auth and role', () => {
    const store = useAuthStore();

    store.login('user');

    expect(store.isAuthenticated).toBe(true);
    expect(store.role).toBe('user');
  });

  it('logout delegates to resetAuthState', () => {
    const store = useAuthStore();
    const resetSpy = vi.spyOn(store, 'resetAuthState');

    store.logout();

    expect(resetSpy).toHaveBeenCalledTimes(1);
  });
});
