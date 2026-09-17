import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SsoCallback from '@/pages/auth/SsoCallback.vue';

const mockSsoCallback = vi.fn();
const mockSetAuth = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
  createI18n: () => ({
    global: {
      t: (key: string) => key,
    },
  }),
}));

const replaceMock = vi.fn();
const routeQuery: Record<string, unknown> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery,
  }),
  useRouter: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/api/auth', () => ({
  authApi: {
    ssoCallback: (...args: unknown[]) => mockSsoCallback(...args),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    setAuth: mockSetAuth,
  }),
}));

const setAccessTokenMock = vi.fn();
const setRefreshTokenMock = vi.fn();
vi.mock('@/utils/auth', () => ({
  setAccessToken: (token: string) => setAccessTokenMock(token),
  setRefreshToken: (token: string) => setRefreshTokenMock(token),
}));

const stubs = {
  AuthBackground: {
    template: '<div><slot /></div>',
  },
  AuthCard: {
    name: 'AuthCard',
    props: ['showLogo', 'showSubmitButton'],
    template: '<div><slot name="title" /><slot /></div>',
  },
  TextButton: {
    name: 'TextButton',
    template: '<button><slot /></button>',
  },
};

describe('SsoCallback.vue', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(routeQuery).forEach((key) => {
      delete routeQuery[key];
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '#access_token=access123&refresh_token=refresh123',
      },
    });
  });

  const factory = () =>
    mount(SsoCallback, {
      global: { stubs },
    });

  it('happy path: handles successful SSO callback and redirects', async () => {
    routeQuery.provider = 'google';
    mockSsoCallback.mockResolvedValue({
      success: true,
      data: { access_token: 'api-access', refresh_token: 'api-refresh' },
    });

    factory();
    await flushPromises();

    expect(mockSsoCallback).toHaveBeenCalled();
    expect(setAccessTokenMock).toHaveBeenCalledWith('api-access');
    expect(setRefreshTokenMock).toHaveBeenCalledWith('api-refresh');
    expect(mockSetAuth).toHaveBeenCalledWith(true);
  });

  it('sets error when provider is missing', async () => {
    const wrapper = factory();
    await flushPromises();

    const text = wrapper.text();
    expect(text).toContain('message.sso.missing_params');
  });

  it('surfaces oauthError from query', async () => {
    routeQuery.provider = 'google';
    routeQuery.error = 'access_denied';
    routeQuery.error_description = 'User+denied+access';

    const wrapper = factory();
    await flushPromises();

    expect(wrapper.text()).toContain('User denied access');
  });
});
