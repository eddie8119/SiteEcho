import { createTestingPinia } from '@pinia/testing';
import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useRoute, useRouter } from 'vue-router';

import Login from '@/pages/auth/Login.vue';
import { useAuthStore } from '@/stores/useAuthStore';

const {
  mockLogin,
  mockSsoLogin,
  mockSetAccessToken,
  mockSetRefreshToken,
  mockClearTokens,
  mockIsAccessTokenValid,
} = vi.hoisted(() => ({
  mockLogin: vi.fn(),
  mockSsoLogin: vi.fn(),
  mockSetAccessToken: vi.fn(),
  mockSetRefreshToken: vi.fn(),
  mockClearTokens: vi.fn(),
  mockIsAccessTokenValid: vi.fn(() => true),
}));

vi.mock('@/composables/query/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    ssoLogin: mockSsoLogin,
  }),
}));

vi.mock('@/utils/auth', () => ({
  setAccessToken: mockSetAccessToken,
  setRefreshToken: mockSetRefreshToken,
  clearTokens: mockClearTokens,
  isAccessTokenValid: mockIsAccessTokenValid,
}));

// Simplify form validation to avoid coupling tests to vee-validate internals
vi.mock('@/composables/useFormValidation', () => ({
  useFormValidation: () => ({
    handleSubmit: (fn: (values: { email: string; password: string }) => unknown) => async () => {
      await fn({ email: 'test@example.com', password: 'Test1234!' });
    },
    errors: { value: {} },
    isSubmitting: { value: false },
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: vi.fn(),
  useRoute: vi.fn(),
}));

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

describe('Login.vue Logic', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let wrapper: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let authStore: any;
  const mockRouter = {
    replace: vi.fn(),
    push: vi.fn(),
  };
  const mockRoute = {
    query: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRouter);
    (useRoute as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockRoute);

    wrapper = mount(Login, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            stubActions: false,
          }),
        ],
        stubs: {
          AuthBackground: {
            template: '<div><slot /></div>',
          },
          AuthCardBanner: {
            name: 'AuthCardBanner',
            template: '<div><slot /><slot name="title" /><slot name="button-text" /></div>',
            emits: ['submit'],
          },
          LoginForm: {
            name: 'LoginForm',
            template: '<div></div>',
            props: ['email', 'password', 'errors'],
            emits: ['update:email', 'update:password', 'blur:email', 'blur:password', 'sso-login'],
          },
        },
      },
    });

    authStore = useAuthStore();
  });

  it('updates email and password when LoginForm emits updates', async () => {
    const loginForm = wrapper.findComponent({ name: 'LoginForm' });

    await loginForm.vm.$emit('update:email', 'test@example.com');
    await loginForm.vm.$emit('update:password', 'Test1234!');

    expect(loginForm.props('email')).toBe('test@example.com');
    expect(loginForm.props('password')).toBe('Test1234!');
  });

  it('calls login API with correct data on submit', async () => {
    const loginForm = wrapper.findComponent({ name: 'LoginForm' });
    await loginForm.vm.$emit('update:email', 'test@example.com');
    await loginForm.vm.$emit('update:password', 'Test1234!');
    await flushPromises();

    mockLogin.mockResolvedValue({
      success: true,
      data: {
        access_token: 'fake-access-token',
        refresh_token: 'fake-refresh-token',
      },
    });

    const authCardBanner = wrapper.findComponent({ name: 'AuthCardBanner' });
    await authCardBanner.vm.$emit('submit');

    await flushPromises();

    expect(mockLogin).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Test1234!',
    });
  });

  it('handles successful login correctly', async () => {
    const loginForm = wrapper.findComponent({ name: 'LoginForm' });
    await loginForm.vm.$emit('update:email', 'test@example.com');
    await loginForm.vm.$emit('update:password', 'Test1234!');
    await flushPromises();

    mockLogin.mockResolvedValue({
      success: true,
      data: {
        access_token: 'fake-access-token',
        refresh_token: 'fake-refresh-token',
      },
    });

    const authCardBanner = wrapper.findComponent({ name: 'AuthCardBanner' });
    await authCardBanner.vm.$emit('submit');
    await flushPromises();

    expect(mockSetAccessToken).toHaveBeenCalledWith('fake-access-token');
    expect(mockSetRefreshToken).toHaveBeenCalledWith('fake-refresh-token');
    expect(authStore.setAuth).toHaveBeenCalledWith(true);
    expect(mockRouter.replace).toHaveBeenCalledWith('/planning/upload');
  });

  it('redirects to query param if present after login', async () => {
    mockRoute.query = { redirect: '/dashboard' };

    const loginForm = wrapper.findComponent({ name: 'LoginForm' });
    await loginForm.vm.$emit('update:email', 'test@example.com');
    await loginForm.vm.$emit('update:password', 'Test1234!');
    await flushPromises();

    mockLogin.mockResolvedValue({
      success: true,
      data: { access_token: 't', refresh_token: 't' },
    });

    const authCardBanner = wrapper.findComponent({ name: 'AuthCardBanner' });
    await authCardBanner.vm.$emit('submit');
    await flushPromises();

    expect(mockRouter.replace).toHaveBeenCalledWith('/dashboard');
  });

  it('handles login failure', async () => {
    const loginForm = wrapper.findComponent({ name: 'LoginForm' });
    await loginForm.vm.$emit('update:email', 'test@example.com');
    // Even for failure test, use valid password format to ensure submit is triggered
    await loginForm.vm.$emit('update:password', 'Test1234!');

    const error = new Error('Login failed');
    mockLogin.mockRejectedValue(error);

    const authCardBanner = wrapper.findComponent({ name: 'AuthCardBanner' });
    await authCardBanner.vm.$emit('submit');
    await flushPromises();

    expect(authStore.resetAuthState).toHaveBeenCalled();
    // Error handling logic in useFormError is hard to test without mocking it or checking side effects (like errorMessage prop on AuthCard)
    // We can check if AuthCard receives an error message if we didn't fully stub it, or check the prop
    // But Login.vue passes :error-message="errorMessage"
  });

  it('calls ssoLogin when LoginForm emits sso-login', async () => {
    const loginForm = wrapper.findComponent({ name: 'LoginForm' });
    await loginForm.vm.$emit('sso-login', 'google');

    expect(mockSsoLogin).toHaveBeenCalledWith('google');
  });
});
