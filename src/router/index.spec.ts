import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { NavigationGuard, RouteLocationNormalizedLoaded } from 'vue-router';

// Use vi.hoisted so these shared mocks & arrays exist before any vi.mock factory is hoisted
const {
  registeredGuards,
  mockUseAuthStore,
  mockIsAccessTokenValid,
  promptLoginRequiredMock,
  detectDeviceMock,
} = vi.hoisted(() => ({
  registeredGuards: [] as NavigationGuard[],
  mockUseAuthStore: vi.fn(),
  mockIsAccessTokenValid: vi.fn(),
  promptLoginRequiredMock: vi.fn((options: { onAfterPrompt?: () => Promise<void> | void }) =>
    options.onAfterPrompt ? Promise.resolve(options.onAfterPrompt()) : Promise.resolve()
  ),
  detectDeviceMock: vi.fn(() => ({ isPWA: false, isMobile: false })),
}));

Object.defineProperty(window, 'matchMedia', {
  configurable: true,
  value: vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

vi.mock('vue-router', () => ({
  createRouter: () => ({
    beforeEach: (guard: NavigationGuard) => {
      registeredGuards.push(guard);
    },
    afterEach: vi.fn(),
  }),
  createWebHistory: vi.fn(),
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => mockUseAuthStore(),
}));

vi.mock('@/utils/auth', () => ({
  isAccessTokenValid: () => mockIsAccessTokenValid(),
}));

vi.mock('@/utils/authPrompt', () => ({
  LOGIN_REQUIRED_MESSAGE_KEY: 'message.login_required',
  promptLoginRequired: (options: { onAfterPrompt?: () => Promise<void> | void }) =>
    promptLoginRequiredMock(options),
}));

vi.mock('@/utils/deviceDetector', () => ({
  detectDevice: () => detectDeviceMock(),
  shouldUseMobileLayout: vi.fn(() => false),
}));

// Import router module to register the guard
import '@/router';

describe('router navigation guard', () => {
  beforeEach(() => {
    mockUseAuthStore.mockReset();
    mockIsAccessTokenValid.mockReset();
    detectDeviceMock.mockReturnValue({ isPWA: false, isMobile: false });
  });

  const getGuard = () => {
    const guard = registeredGuards[0];
    if (!guard) {
      throw new Error('Navigation guard not registered');
    }
    return guard;
  };

  it('shows login toast before redirecting unauthenticated user from protected route', async () => {
    const logout = vi.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      logout,
    });
    mockIsAccessTokenValid.mockReturnValue(false);

    const guard = getGuard();
    const to = {
      path: '/planning',
      fullPath: '/planning',
      name: 'planning-upload',
      meta: { requiresAuth: true },
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const from = {} as RouteLocationNormalizedLoaded;
    const next = vi.fn();

    await guard(to, from, next);

    expect(logout).toHaveBeenCalledTimes(1);
    expect(promptLoginRequiredMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageKey: 'message.login_required',
      })
    );
    expect(next).toHaveBeenCalledWith({ name: 'login', query: { redirect: '/planning' } });
  });

  it('allows navigation to public auth page without authentication', () => {
    const logout = vi.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      logout,
    });
    mockIsAccessTokenValid.mockReturnValue(false);

    const guard = getGuard();
    const to = {
      path: '/auth/login',
      fullPath: '/auth/login',
      name: 'login',
      meta: {},
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const from = {
      path: '/',
      fullPath: '/',
      name: 'landing',
      meta: {},
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const next = vi.fn();

    guard(to, from, next);

    expect(next).toHaveBeenCalledWith();
  });

  it('redirects authenticated user away from public auth pages to planning-upload', () => {
    const logout = vi.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: true,
      logout,
    });
    mockIsAccessTokenValid.mockReturnValue(true);

    const guard = getGuard();
    const to = {
      path: '/auth/login',
      fullPath: '/auth/login',
      name: 'login',
      meta: {},
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const from = {
      path: '/',
      fullPath: '/',
      name: 'landing',
      meta: {},
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const next = vi.fn();

    guard(to, from, next);

    expect(next).toHaveBeenCalledWith({ name: 'overview' });
  });

  it('redirects Supabase recovery hash to reset-password route', () => {
    const logout = vi.fn();
    mockUseAuthStore.mockReturnValue({
      isAuthenticated: false,
      logout,
    });
    mockIsAccessTokenValid.mockReturnValue(false);

    const guard = getGuard();
    const to = {
      path: '/auth/login',
      fullPath: '/auth/login#type=recovery&token=abc',
      name: 'login',
      hash: '#type=recovery&token=abc',
      meta: {},
      matched: [],
      params: {},
      query: {},
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const from = {
      path: '/',
      fullPath: '/',
      name: 'landing',
      meta: {},
      matched: [],
      params: {},
      query: {},
      hash: '',
      redirectedFrom: undefined,
    } as RouteLocationNormalizedLoaded;
    const next = vi.fn();

    guard(to, from, next);

    expect(next).toHaveBeenCalledWith({
      name: 'reset-password',
      hash: '#type=recovery&token=abc',
    });
  });
});
