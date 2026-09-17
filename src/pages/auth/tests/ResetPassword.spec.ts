import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import ResetPassword from '@/pages/auth/ResetPassword.vue';

const mockResetPassword = vi.fn();

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
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: replaceMock,
  }),
}));

vi.mock('@/composables/query/useUser', () => ({
  useUser: () => ({
    resetPassword: mockResetPassword,
    isResettingPassword: { value: false },
  }),
}));

vi.mock('@/composables/useFormValidation', () => ({
  useFormValidation: () => ({
    handleSubmit:
      (fn: (values: { newPassword: string; newConfirmPassword: string }) => Promise<void> | void) =>
      async () =>
        fn({ newPassword: 'NewPass123!', newConfirmPassword: 'NewPass123!' }),
    errors: { value: {} },
  }),
}));

const stubs = {
  AuthBackground: {
    template: '<div><slot /></div>',
  },
  AuthCard: {
    name: 'AuthCard',
    props: ['errorMessage', 'message', 'loading', 'isInvalid'],
    emits: ['submit'],
    template:
      '<div><button data-test="submit" @click="$emit(\'submit\')">submit</button><slot /><slot name="title" /><slot name="button-text" /></div>',
  },
  ResetPasswordForm: {
    name: 'ResetPasswordForm',
    props: ['newPassword', 'newConfirmPassword', 'errors', 'errorMessage'],
    emits: [
      'update:new-password',
      'update:new-confirm-password',
      'blur:new-password',
      'blur:new-confirm-password',
    ],
    template: '<div></div>',
  },
};

describe('ResetPassword.vue', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // 模擬 URL query 參數
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
        search: '?email=test%40example.com&token=token123&uid=uid123',
      },
    });
  });

  const factory = () =>
    mount(ResetPassword, {
      global: { stubs },
    });

  it('happy path: calls resetPassword with correct payload and redirects to login on success', async () => {
    mockResetPassword.mockResolvedValue({ success: true, message: '' });

    const wrapper = factory();

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    expect(mockResetPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      newPassword: 'NewPass123!',
      newConfirmPassword: 'NewPass123!',
      token: 'token123',
      uid: 'uid123',
    });
  });

  it('shows error when required url params are missing', async () => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
        search: '',
      },
    });

    const wrapper = factory();
    await flushPromises();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    expect(authCard.props('errorMessage')).toBe('error.invalid_or_expired_token');
  });

  it('shows backend error message when resetPassword returns failure', async () => {
    mockResetPassword.mockResolvedValue({ success: false, message: 'invalid token' });

    const wrapper = factory();

    const submitBtn = wrapper.find('[data-test="submit"]');
    await submitBtn.trigger('click');
    await flushPromises();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    expect(authCard.props('errorMessage')).toBe('invalid token');
  });
});
