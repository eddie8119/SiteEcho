import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuth } from '@/composables/query/useAuth';

const loginMock = vi.fn();
const ssoLoginMock = vi.fn();

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@tanstack/vue-query', () => {
  const createMutation = (mutationFn: (variables: unknown) => Promise<unknown>) => ({
    mutateAsync: (variables: unknown) => mutationFn(variables),
    isPending: { value: false },
    error: { value: null },
  });

  return {
    useMutation: ({ mutationFn }: { mutationFn: (variables: unknown) => Promise<unknown> }) =>
      createMutation(mutationFn),
  };
});

vi.mock('@/api/auth', () => ({
  authApi: {
    login: (payload: unknown) => loginMock(payload),
    ssoLogin: (provider: unknown) => ssoLoginMock(provider),
  },
}));

describe('useAuth composable', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  it('login forwards payload to authApi.login and returns API response', async () => {
    loginMock.mockResolvedValue({ success: true, data: { token: 'abc' } });

    const { login } = useAuth();
    const payload = { email: 'test@example.com', password: 'Pass1234!' };

    const result = await login(payload as never);

    expect(loginMock).toHaveBeenCalledWith(payload);
    expect(result).toEqual({ success: true, data: { token: 'abc' } });
  });

  it('login returns fallback message when API rejects', async () => {
    loginMock.mockRejectedValue(new Error('network'));

    const { login } = useAuth();

    const result = await login({ email: 'a', password: 'b' } as never);

    expect(result).toEqual({ success: false, message: 'message.error.login' });
  });

  it('ssoLogin redirects browser when API returns success url', async () => {
    ssoLoginMock.mockResolvedValue({ success: true, data: { url: 'https://sso.test/login' } });

    const { ssoLogin } = useAuth();
    await ssoLogin('google');

    expect(ssoLoginMock).toHaveBeenCalledWith('google');
    expect(window.location.href).toBe('https://sso.test/login');
  });

  it('ssoLogin does not redirect when API response is invalid', async () => {
    ssoLoginMock.mockResolvedValue({ success: false, message: 'error' });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { ssoLogin } = useAuth();
    await ssoLogin('google');

    expect(window.location.href).toBe('');
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
