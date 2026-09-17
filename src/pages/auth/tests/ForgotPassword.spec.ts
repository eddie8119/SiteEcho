import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import ForgotPassword from '@/pages/auth/ForgotPassword.vue';

const mockForgotPassword = vi.fn();

const isForgettingPassword = ref(false);
const forgotPasswordError = ref<Error | null>(null);
const errorsRef = ref<Record<string, string>>({});
const emailFieldRef = ref('test@example.com');

let formValues = { email: 'test@example.com' };

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

vi.mock('@/composables/query/useUser', () => ({
  useUser: () => ({
    forgotPassword: mockForgotPassword,
    isForgettingPassword,
    forgotPasswordError,
  }),
}));

vi.mock('@/composables/useFormValidation', () => ({
  useFormValidation: () => ({
    handleSubmit: (fn: (values: typeof formValues) => Promise<void> | void) => async () =>
      fn(formValues),
    errors: errorsRef,
  }),
}));

vi.mock('vee-validate', () => ({
  useField: () => ({
    value: emailFieldRef,
    handleBlur: vi.fn(),
  }),
}));

const factory = () =>
  mount(ForgotPassword, {
    global: {
      stubs: {
        AuthBackground: {
          template: '<div><slot /></div>',
        },
        AuthCard: {
          name: 'AuthCard',
          props: ['errorMessage', 'message', 'loading', 'isInvalid'],
          emits: ['submit'],
          template: `
            <div>
              <button data-test="submit" @click="$emit('submit')">submit</button>
              <slot />
              <slot name="title" />
              <slot name="button-text" />
            </div>
          `,
        },
        ForgotPasswordForm: {
          name: 'ForgotPasswordForm',
          props: ['email', 'errors'],
          emits: ['update:email', 'blur:email'],
          template: '<div></div>',
        },
      },
    },
  });

describe('ForgotPassword.vue business logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formValues = { email: 'test@example.com' };
    emailFieldRef.value = formValues.email;
    errorsRef.value = {};
    isForgettingPassword.value = false;
    forgotPasswordError.value = null;
  });

  it('calls forgotPassword with form values and shows success message on success', async () => {
    mockForgotPassword.mockResolvedValue({ success: true, message: '' });
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(mockForgotPassword).toHaveBeenCalledWith({ email: 'test@example.com' });
    expect(authCard.props('message')).toBe('message.dialog.check_the_email');
    expect(authCard.props('errorMessage')).toBeNull();
  });

  it('surfaces API message when backend reports failure', async () => {
    mockForgotPassword.mockResolvedValue({ success: false, message: 'unable to send' });
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(authCard.props('errorMessage')).toBe('unable to send');
    expect(authCard.props('message')).toBeNull();
  });

  it('uses server provided error message when forgotPassword throws with response data', async () => {
    mockForgotPassword.mockRejectedValue({
      response: { data: { message: 'server error' } },
    });
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(authCard.props('errorMessage')).toBe('server error');
  });

  it('falls back to generic error when no server message provided', async () => {
    mockForgotPassword.mockRejectedValue(new Error('network down'));
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(authCard.props('errorMessage')).toBe('error.reset_password_failed');
  });

  it('binds loading state from useUser to AuthCard', async () => {
    isForgettingPassword.value = true;
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    expect(authCard.props('loading')).toBe(true);
  });
});
