import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import ChangePassword from '@/pages/protected/user/ChangePassword.vue';

const {
  mockChangePassword,
  mockLogoutAction,
  mockHandleError,
  mockResetForm,
  mockElMessageSuccess,
} = vi.hoisted(() => ({
  mockChangePassword: vi.fn(),
  mockLogoutAction: vi.fn(),
  mockHandleError: vi.fn(),
  mockResetForm: vi.fn(),
  mockElMessageSuccess: vi.fn(),
}));

const formErrorsRef = ref<Record<string, string>>({});
const isSubmittingRef = ref(false);
const errorMessageRef = ref<string | undefined>(undefined);

let formValues = {
  oldPassword: 'OldPass123!',
  newPassword: 'NewPass123!',
  newConfirmPassword: 'NewPass123!',
};

const fieldValueMap = {
  oldPassword: ref(formValues.oldPassword),
  newPassword: ref(formValues.newPassword),
  newConfirmPassword: ref(formValues.newConfirmPassword),
};

vi.mock('element-plus', () => ({
  ElMessage: {
    success: mockElMessageSuccess,
  },
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

vi.mock('@vee-validate/zod', () => ({
  toTypedSchema: (schema: unknown) => schema,
}));

vi.mock('vee-validate', () => ({
  useForm: () => ({
    handleSubmit: (fn: (values: typeof formValues) => Promise<void> | void) => async () =>
      fn(formValues),
    errors: formErrorsRef,
    isSubmitting: isSubmittingRef,
    resetForm: mockResetForm,
  }),
  useField: (name: keyof typeof fieldValueMap) => ({
    value: fieldValueMap[name],
    handleBlur: vi.fn(),
  }),
}));

vi.mock('@/composables/query/useUser', () => ({
  useUser: () => ({
    changePassword: mockChangePassword,
  }),
}));

vi.mock('@/composables/useAuthentication', () => ({
  useAuthentication: () => ({
    logoutAction: mockLogoutAction,
  }),
}));

vi.mock('@/composables/useFormError', () => ({
  useFormError: () => ({
    errorMessage: errorMessageRef,
    handleError: mockHandleError,
  }),
}));

const factory = () =>
  mount(ChangePassword, {
    global: {
      stubs: {
        AuthCard: {
          name: 'AuthCard',
          props: ['errorMessage', 'loading', 'showLogo'],
          emits: ['submit'],
          template: `
            <div>
              <button data-test="submit" @click="$emit('submit')">submit</button>
              <slot />
              <slot name="button-text" />
            </div>
          `,
        },
        ChangePasswordForm: {
          name: 'ChangePasswordForm',
          props: ['oldPassword', 'newPassword', 'newConfirmPassword', 'errors'],
          emits: [
            'update:old-password',
            'update:new-password',
            'update:new-confirm-password',
            'blur:old-password',
            'blur:new-password',
            'blur:new-confirm-password',
          ],
          template: '<div></div>',
        },
      },
    },
  });

describe('ChangePassword.vue business logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    formValues = {
      oldPassword: 'OldPass123!',
      newPassword: 'NewPass123!',
      newConfirmPassword: 'NewPass123!',
    };
    fieldValueMap.oldPassword.value = formValues.oldPassword;
    fieldValueMap.newPassword.value = formValues.newPassword;
    fieldValueMap.newConfirmPassword.value = formValues.newConfirmPassword;
    formErrorsRef.value = {};
    isSubmittingRef.value = false;
    errorMessageRef.value = undefined;
  });

  it('calls changePassword and handles success flow', async () => {
    mockChangePassword.mockResolvedValue({ success: true, message: '' });
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(mockChangePassword).toHaveBeenCalledWith(formValues);
    expect(mockElMessageSuccess).toHaveBeenCalledWith('message.success.change');
    expect(mockResetForm).toHaveBeenCalled();
    expect(mockLogoutAction).toHaveBeenCalled();
    expect(authCard.props('errorMessage')).toBeUndefined();
  });

  it('sets error message when API returns failure', async () => {
    mockChangePassword.mockResolvedValue({ success: false, message: 'bad request' });
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(mockElMessageSuccess).not.toHaveBeenCalled();
    expect(mockResetForm).not.toHaveBeenCalled();
    expect(mockLogoutAction).not.toHaveBeenCalled();
    expect(authCard.props('errorMessage')).toBe('bad request');
    expect(errorMessageRef.value).toBe('bad request');
  });

  it('delegates thrown errors to handleError', async () => {
    const apiError = new Error('network');
    mockChangePassword.mockRejectedValue(apiError);
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    await authCard.vm.$emit('submit');
    await flushPromises();

    expect(mockHandleError).toHaveBeenCalledWith(apiError);
    expect(authCard.props('errorMessage')).toBeUndefined();
  });

  it('binds isSubmitting state to AuthCard loading prop', () => {
    isSubmittingRef.value = true;
    const wrapper = factory();

    const authCard = wrapper.findComponent({ name: 'AuthCard' });
    expect(authCard.props('loading')).toBe(true);
  });
});
