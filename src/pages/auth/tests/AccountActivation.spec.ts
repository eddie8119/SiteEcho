import { flushPromises, mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AccountActivation from '@/pages/auth/AccountActivation.vue';

const mockActivateAccount = vi.fn();
const isActivating = { value: false };
const activateError = { value: null } as { value: unknown };

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

const pushMock = vi.fn();
const routeQuery: Record<string, unknown> = {};

vi.mock('vue-router', () => ({
  useRoute: () => ({
    query: routeQuery,
  }),
  useRouter: () => ({
    push: pushMock,
  }),
}));

vi.mock('@/composables/query/useUser', () => ({
  useUser: () => ({
    activateAccount: mockActivateAccount,
    isActivating,
    activateError,
  }),
}));

const stubs = {
  AuthCard: {
    name: 'AuthCard',
    props: ['errorMessage', 'loading', 'showSubmitButton'],
    template: '<div><slot name="title" /><slot /><div class="error">{{ errorMessage }}</div></div>',
  },
  ElButton: {
    name: 'ElButton',
    props: ['type', 'size', 'block', 'class'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')"><slot /></button>',
  },
  ElIcon: {
    name: 'ElIcon',
    template: '<span><slot /></span>',
  },
};

describe('AccountActivation.vue', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(routeQuery, {
      token: 'token123',
      email: 'test@example.com',
    });
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        hash: '',
      },
    });
  });

  const factory = () =>
    mount(AccountActivation, {
      global: { stubs },
    });

  it('happy path: activates account when token and email are present', async () => {
    mockActivateAccount.mockResolvedValue({});

    const wrapper = factory();
    await flushPromises();

    expect(mockActivateAccount).toHaveBeenCalledWith({
      token: 'token123',
      email: 'test@example.com',
    });
    expect(wrapper.text()).toContain('message.dialog.activation_success');
  });

  it('shows error when activation link is invalid', async () => {
    Object.keys(routeQuery).forEach((key) => {
      delete routeQuery[key];
    });

    const wrapper = factory();
    await flushPromises();

    expect(wrapper.text()).toContain('error.invalid_activation_link');
  });

  it('shows backend error message when activateAccount throws', async () => {
    mockActivateAccount.mockRejectedValue({
      response: { data: { message: 'activation failed' } },
    });

    const wrapper = factory();
    await flushPromises();

    expect(wrapper.text()).toContain('activation failed');
  });
});
