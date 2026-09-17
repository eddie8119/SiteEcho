import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';

import { useUser } from '@/composables/query/useUser';

const registerMock = vi.fn();
const resetPasswordMock = vi.fn();
const activateAccountMock = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tanstack/vue-query', () => {
  const createMutation = (mutationFn: (variables: unknown) => Promise<unknown>) => ({
    mutateAsync: (variables: unknown) => mutationFn(variables),
    isPending: ref(false),
    error: ref(null),
  });

  return {
    useMutation: ({ mutationFn }: { mutationFn: (variables: unknown) => Promise<unknown> }) =>
      createMutation(mutationFn),
    useQuery: () => ({
      data: ref(null),
      isLoading: ref(false),
      error: ref(null),
      refetch: vi.fn(),
    }),
    useQueryClient: () => ({
      invalidateQueries: vi.fn(),
    }),
  };
});

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({
    isAuthenticated: true,
  }),
}));

vi.mock('@/api/user', () => ({
  userApi: {
    getUserProfile: vi.fn().mockResolvedValue({ data: {} }),
    register: (payload: unknown) => registerMock(payload),
    resetPassword: (payload: unknown) => resetPasswordMock(payload),
    activateAccount: (payload: unknown) => activateAccountMock(payload),
    resendActivation: vi.fn(),
    forgotPassword: vi.fn(),
    changePassword: vi.fn(),
    updateUserProfile: vi.fn(),
  },
}));

describe('useUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('register calls userApi.register with payload and returns success result', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'Tester',
    };
    registerMock.mockResolvedValue({ success: true, message: 'ok' });

    const { register } = useUser();
    const result = await register(payload as never);

    expect(registerMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true, message: 'ok' });
  });

  it('register returns whitelist error message when API rejects with 403', async () => {
    const payload = {
      email: 'test@example.com',
      password: 'Test1234!',
      confirmPassword: 'Test1234!',
      name: 'Tester',
    };
    registerMock.mockRejectedValue({
      response: { status: 403, data: { message: 'custom error' } },
    });

    const { register } = useUser();
    const result = await register(payload as never);

    expect(result).toEqual({ success: false, message: 'custom error' });
  });

  it('resetPassword sends payload to API and returns success result', async () => {
    const payload = {
      email: 'test@example.com',
      newPassword: 'NewPass123!',
      newConfirmPassword: 'NewPass123!',
      token: 'token',
      uid: 'uid',
    };
    resetPasswordMock.mockResolvedValue({ success: true, message: 'ok' });

    const { resetPassword } = useUser();
    const result = await resetPassword(payload as never);

    expect(resetPasswordMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true, message: 'ok' });
  });

  it('resetPassword returns fallback message when API throws', async () => {
    const payload = {
      email: 'test@example.com',
      newPassword: 'NewPass123!',
      newConfirmPassword: 'NewPass123!',
      token: 'token',
      uid: 'uid',
    };
    resetPasswordMock.mockRejectedValue(new Error('network error'));

    const { resetPassword } = useUser();
    const result = await resetPassword(payload as never);

    expect(result).toEqual({ success: false, message: 'message.error.change_password' });
  });

  it('activateAccount calls API and bubbles failure message', async () => {
    const payload = { token: 'token', email: 'test@example.com' };
    activateAccountMock.mockResolvedValue({ success: true });

    const { activateAccount } = useUser();
    const result = await activateAccount(payload as never);

    expect(activateAccountMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true });
  });
});
