import { jwtDecode } from 'jwt-decode';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearAllTokens,
  clearTokens,
  getAccessRole,
  getAccessToken,
  getRefreshToken,
  isAccessTokenValid,
  isPWA,
  isRefreshTokenValid,
  isTokenValid,
  setAccessRole,
  setAccessToken,
  setRefreshToken,
} from '@/utils/auth';
import { detectDevice } from '@/utils/deviceDetector';

vi.mock('jwt-decode', () => ({
  jwtDecode: vi.fn(),
}));

vi.mock('@/utils/deviceDetector', () => ({
  detectDevice: vi.fn(),
}));

const mockedJwtDecode = jwtDecode as unknown as ReturnType<typeof vi.fn>;
const mockedDetectDevice = detectDevice as unknown as ReturnType<typeof vi.fn>;

describe('utils/auth token utilities', () => {
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
    vi.clearAllMocks();
    // Default to Web mode
    mockedDetectDevice.mockReturnValue({ isPWA: false });
  });

  afterAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).localStorage = originalLocalStorage;
  });

  it('get/set access and refresh tokens', () => {
    setAccessToken('access');
    setRefreshToken('refresh');

    expect(getAccessToken()).toBe('access');
    expect(getRefreshToken()).toBe('refresh');
  });

  it('clearTokens removes all related keys', () => {
    setAccessToken('access');
    setRefreshToken('refresh');
    setAccessRole('admin');

    clearTokens();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();
  });

  it('isTokenValid returns false for null or invalid token', () => {
    expect(isTokenValid(null)).toBe(false);

    mockedJwtDecode.mockImplementation(() => {
      throw new Error('decode error');
    });

    expect(isTokenValid('invalid')).toBe(false);
  });

  it('isTokenValid returns true when token exp is in the future', () => {
    const now = Date.now() / 1000;
    mockedJwtDecode.mockReturnValue({ exp: now + 100 } as never);

    expect(isTokenValid('valid')).toBe(true);
  });

  it('isTokenValid returns false when token exp is in the past', () => {
    const now = Date.now() / 1000;
    mockedJwtDecode.mockReturnValue({ exp: now - 100 } as never);

    expect(isTokenValid('expired')).toBe(false);
  });

  it('isAccessTokenValid validates JWT access token while refresh token only needs to exist', () => {
    setAccessToken('access-token');
    setRefreshToken('opaque-refresh-token');

    const now = Date.now() / 1000;
    mockedJwtDecode.mockReturnValue({ exp: now + 100 } as never);

    expect(isAccessTokenValid()).toBe(true);
    expect(isRefreshTokenValid()).toBe(true);
  });

  it('isRefreshTokenValid returns false when refresh token is missing', () => {
    expect(isRefreshTokenValid()).toBe(false);
  });

  it('get/set access role', () => {
    setAccessRole('admin');

    expect(getAccessRole()).toBe('admin');
  });

  it('isPWA returns correct value from detectDevice', () => {
    mockedDetectDevice.mockReturnValue({ isPWA: true });
    expect(isPWA()).toBe(true);

    mockedDetectDevice.mockReturnValue({ isPWA: false });
    expect(isPWA()).toBe(false);
  });

  it('Web and PWA tokens are stored separately', () => {
    // Set Web token
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    setAccessToken('web-token');
    setRefreshToken('web-refresh');
    setAccessRole('user');

    // Set PWA token
    mockedDetectDevice.mockReturnValue({ isPWA: true });
    setAccessToken('pwa-token');
    setRefreshToken('pwa-refresh');
    setAccessRole('admin');

    // Verify they are separate
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    expect(getAccessToken()).toBe('web-token');
    expect(getRefreshToken()).toBe('web-refresh');
    expect(getAccessRole()).toBe('user');

    mockedDetectDevice.mockReturnValue({ isPWA: true });
    expect(getAccessToken()).toBe('pwa-token');
    expect(getRefreshToken()).toBe('pwa-refresh');
    expect(getAccessRole()).toBe('admin');
  });

  it('clearTokens only clears current environment tokens', () => {
    // Set both Web and PWA tokens
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    setAccessToken('web-token');

    mockedDetectDevice.mockReturnValue({ isPWA: true });
    setAccessToken('pwa-token');

    // Clear Web tokens only
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    clearTokens();

    // Web token should be cleared
    expect(getAccessToken()).toBeNull();

    // PWA token should still exist
    mockedDetectDevice.mockReturnValue({ isPWA: true });
    expect(getAccessToken()).toBe('pwa-token');
  });

  it('clearAllTokens clears both Web and PWA tokens', () => {
    // Set both Web and PWA tokens
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    setAccessToken('web-token');
    setRefreshToken('web-refresh');
    setAccessRole('user');

    mockedDetectDevice.mockReturnValue({ isPWA: true });
    setAccessToken('pwa-token');
    setRefreshToken('pwa-refresh');
    setAccessRole('admin');

    // Clear all tokens
    clearAllTokens();

    // Both should be cleared
    mockedDetectDevice.mockReturnValue({ isPWA: false });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();

    mockedDetectDevice.mockReturnValue({ isPWA: true });
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(getAccessRole()).toBeNull();
  });
});
