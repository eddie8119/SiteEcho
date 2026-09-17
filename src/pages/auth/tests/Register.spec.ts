import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import Register from '@/pages/auth/Register.vue';

const mockRegister = vi.fn();
const mockSsoLogin = vi.fn();
const mockHandleError = vi.fn();

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

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/router', () => ({
  default: {
    push: vi.fn(),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    setPendingActivationEmail: vi.fn(),
  }),
}));

vi.mock('@/composables/query/useUser', () => ({
  useUser: () => ({
    register: mockRegister,
  }),
}));

vi.mock('@/composables/query/useAuth', () => ({
  useAuth: () => ({
    ssoLogin: mockSsoLogin,
  }),
}));

vi.mock('@/composables/useFormError', () => ({
  useFormError: () => ({
    errorMessage: undefined,
    handleError: mockHandleError,
  }),
}));

// 簡化表單驗證行為：直接在 handleSubmit callback 傳入我們指定的值
vi.mock('@/composables/useFormValidation', () => ({
  useFormValidation: () => ({
    handleSubmit:
      (
        fn: (values: {
          email: string;
          password: string;
          confirmPassword: string;
        }) => Promise<void> | void
      ) =>
      async () =>
        fn({
          email: 'test@example.com',
          password: 'Test1234!',
          confirmPassword: 'Test1234!',
        }),
    errors: { value: {} },
    isSubmitting: { value: false },
  }),
}));

// stub 掉 UI 元件，只暴露需要的事件/props
const stubs = {
  AuthBackground: {
    template: '<div><slot /></div>',
  },
  AuthCardBanner: {
    name: 'AuthCardBanner',
    props: ['errorMessage', 'message', 'loading', 'isInvalid'],
    emits: ['submit'],
    template:
      '<div><button data-test="submit" @click="$emit(\'submit\')">submit</button><slot /><slot name="title" /><slot name="button-text" /></div>',
  },
  RegisterForm: {
    name: 'RegisterForm',
    props: ['email', 'password', 'confirmPassword', 'errors'],
    emits: [
      'update:email',
      'update:password',
      'update:confirm-password',
      'blur:email',
      'blur:password',
      'blur:confirm-password',
      'sso-login',
    ],
    template: '<div></div>',
  },
};

describe('Register.vue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const factory = () =>
    mount(Register, {
      global: {
        stubs,
      },
    });

  it('happy path: calls register with form values and handles success', async () => {
    const wrapper = factory();

    mockRegister.mockResolvedValue({ success: true, message: '' });

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    expect(mockRegister).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
    });
  });

  it('does not submit when password and confirmPassword mismatch', async () => {
    const wrapper = factory();
    const vm = wrapper.vm as unknown as {
      password: string;
      confirmPassword: string;
    };

    vm.password = 'Test1234!';
    vm.confirmPassword = 'Mismatch123!';

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    expect(mockRegister).not.toHaveBeenCalled();
  });

  it('shows API message when backend reports failure', async () => {
    const wrapper = factory();

    mockRegister.mockResolvedValue({ success: false, message: 'email taken' });

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    const authCardBanner = wrapper.findComponent({ name: 'AuthCardBanner' });
    expect(authCardBanner.props('message')).toBe('email taken');
  });

  it('handles thrown error via useFormError', async () => {
    const wrapper = factory();

    const error = new Error('network error');
    mockRegister.mockRejectedValue(error);

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    expect(mockHandleError).toHaveBeenCalledWith(error);
  });

  it('delegates sso-login event to ssoLogin composable', async () => {
    const wrapper = factory();
    const registerForm = wrapper.findComponent({ name: 'RegisterForm' });

    await registerForm.vm.$emit('sso-login', 'google');

    expect(mockSsoLogin).toHaveBeenCalledWith('google');
  });
});
