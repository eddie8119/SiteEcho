import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { clearAuthSource, getAuthSource, setAuthSource } from '../authStorage';

const detectDeviceMock = vi.hoisted(() => vi.fn());

vi.mock('@/utils/deviceDetector', () => ({
  detectDevice: detectDeviceMock,
}));

describe('authStorage', () => {
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
    detectDeviceMock.mockReturnValue({ isPWA: false });
  });

  afterEach(() => {
    clearAuthSource();
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = originalLocalStorage;
  });

  it('sets, gets, and clears auth source', () => {
    expect(getAuthSource()).toBeNull();

    setAuthSource('backend');
    expect(getAuthSource()).toBe('backend');

    setAuthSource('supabase');
    expect(getAuthSource()).toBe('supabase');

    clearAuthSource();
    expect(getAuthSource()).toBeNull();
  });

  it('ignores invalid auth source values', () => {
    localStorageMock.setItem('auth_source', 'unexpected');

    expect(getAuthSource()).toBeNull();
  });

  it('uses web-specific auth source key when not in PWA', () => {
    setAuthSource('backend');

    expect(localStorageMock.getItem('web_auth_source')).toBe('backend');
    expect(localStorageMock.getItem('pwa_auth_source')).toBeNull();
  });

  it('uses pwa-specific auth source key in PWA mode', () => {
    detectDeviceMock.mockReturnValue({ isPWA: true });

    setAuthSource('supabase');

    expect(localStorageMock.getItem('pwa_auth_source')).toBe('supabase');
    expect(localStorageMock.getItem('web_auth_source')).toBeNull();
  });

  it('migrates legacy auth_source to the current environment key', () => {
    localStorageMock.setItem('auth_source', 'backend');

    expect(getAuthSource()).toBe('backend');
    expect(localStorageMock.getItem('web_auth_source')).toBe('backend');
  });
});
