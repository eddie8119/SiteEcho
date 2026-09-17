import { beforeEach, describe, expect, it, vi } from 'vitest';

type Headers = Record<string, string>;
type RequestConfig = {
  headers: Headers;
  [key: string]: unknown;
};

type ResponseInterceptor = {
  success: (res: unknown) => unknown;
  error: (err: HttpError) => Promise<never> | never;
};

interface MockAxiosInstance {
  post: ReturnType<typeof vi.fn>;
  interceptors: {
    request: {
      use: (
        fn: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig
      ) => (config: RequestConfig) => Promise<RequestConfig> | RequestConfig;
    };
    response: {
      use: (
        onFulfilled: (res: unknown) => unknown,
        onRejected: (err: HttpError) => Promise<never> | never
      ) => { onFulfilled: typeof onFulfilled; onRejected: typeof onRejected };
    };
  };
}

type HttpError = {
  isAxiosError: boolean;
  response?: { status?: number };
  config: { _retry?: boolean; headers?: Headers };
};

// Use vi.hoisted so shared mocks are available before any vi.mock factory executes
const {
  requestInterceptors,
  responseInterceptors,
  mainInstance,
  refreshInstance,
  replaceMock,
  logoutMock,
  getAccessTokenMock,
  getRefreshTokenMock,
  isAccessTokenValidMock,
  isRefreshTokenValidMock,
  isPwaMock,
  setAccessTokenMock,
  promptLoginRequiredMock,
} = vi.hoisted(() => ({
  requestInterceptors: [] as Array<
    (config: RequestConfig) => Promise<RequestConfig> | RequestConfig
  >,
  responseInterceptors: [] as ResponseInterceptor[],
  // instances will be assigned later by the axios mock factory
  mainInstance: { value: undefined as MockAxiosInstance | undefined },
  refreshInstance: { value: undefined as MockAxiosInstance | undefined },
  replaceMock: vi.fn(),
  logoutMock: vi.fn(),
  getAccessTokenMock: vi.fn(),
  getRefreshTokenMock: vi.fn(),
  isAccessTokenValidMock: vi.fn(),
  isRefreshTokenValidMock: vi.fn(),
  isPwaMock: vi.fn(),
  setAccessTokenMock: vi.fn(),
  promptLoginRequiredMock: vi.fn((options: { onAfterPrompt?: () => Promise<void> | void }) =>
    options.onAfterPrompt ? Promise.resolve(options.onAfterPrompt()) : Promise.resolve()
  ),
}));

vi.mock('axios', () => {
  const create = vi.fn((): MockAxiosInstance => {
    const shouldCapture = !mainInstance.value;
    const instance: MockAxiosInstance = {
      post: vi.fn(),
      interceptors: {
        request: {
          use: (fn: (config: RequestConfig) => Promise<RequestConfig> | RequestConfig) => {
            // Only track interceptors for the first created instance
            if (shouldCapture) {
              requestInterceptors.push(fn);
            }
            return fn;
          },
        },
        response: {
          use: (
            onFulfilled: (res: unknown) => unknown,
            onRejected: (err: HttpError) => Promise<never> | never
          ) => {
            if (shouldCapture) {
              responseInterceptors.push({ success: onFulfilled, error: onRejected });
            }
            return { onFulfilled, onRejected };
          },
        },
      },
    };

    if (!mainInstance.value) {
      mainInstance.value = instance;
    } else if (!refreshInstance.value) {
      refreshInstance.value = instance;
    }

    return instance;
  });

  const isAxiosError = (error: unknown): error is HttpError =>
    Boolean((error as { isAxiosError?: boolean })?.isAxiosError);

  type AxiosFn = ReturnType<typeof vi.fn> & { create: typeof create };
  const axiosFn = vi.fn(() => ({})) as AxiosFn;
  axiosFn.create = create;

  return {
    default: axiosFn,
    isAxiosError,
  };
});

// Mock router and auth store for logout side effects
vi.mock('@/router', () => ({
  default: {
    currentRoute: { value: { path: '/protected' } },
    replace: replaceMock,
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ logout: logoutMock }),
}));

vi.mock('@/utils/auth', () => ({
  getAccessToken: () => getAccessTokenMock(),
  getRefreshToken: () => getRefreshTokenMock(),
  isAccessTokenValid: () => isAccessTokenValidMock(),
  isRefreshTokenValid: () => isRefreshTokenValidMock(),
  isPWA: () => isPwaMock(),
  setAccessToken: (token: string) => setAccessTokenMock(token),
}));

vi.mock('@/utils/authPrompt', () => ({
  LOGIN_REQUIRED_MESSAGE_KEY: 'message.login_required',
  promptLoginRequired: (options: { onAfterPrompt?: () => Promise<void> | void }) =>
    promptLoginRequiredMock(options),
}));

// Import after mocks so interceptors are registered on the mocked axios instance
import instance from '@/utils/request';

// Silence unused variable warning
void instance;

describe('request axios interceptors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPwaMock.mockReturnValue(false);
  });

  it('attaches bearer token from getAccessToken in request interceptor', async () => {
    const interceptor = requestInterceptors[0];
    expect(interceptor).toBeTypeOf('function');

    getAccessTokenMock.mockReturnValue('access-token');

    const config: RequestConfig = { headers: {} };
    const result = await interceptor(config);

    expect(result.headers.Authorization).toBe('Bearer access-token');
  });

  it('pre-refreshes access token when invalid but refresh token is valid', async () => {
    const interceptor = requestInterceptors[1];
    expect(interceptor).toBeTypeOf('function');

    isAccessTokenValidMock.mockReturnValue(false);
    isRefreshTokenValidMock.mockReturnValue(true);
    getRefreshTokenMock.mockReturnValue('refresh-token');

    // Mock refresh instance post to resolve with new access token
    if (!refreshInstance.value) {
      throw new Error('refreshInstance not initialized');
    }
    (refreshInstance.value as { post: ReturnType<typeof vi.fn> }).post.mockResolvedValue({
      data: { access_token: 'new-access-token' },
    });

    const config: RequestConfig = { headers: {} };

    const result = await interceptor(config);

    expect(setAccessTokenMock).toHaveBeenCalledWith('new-access-token');
    expect(result.headers.Authorization).toBe('Bearer new-access-token');
  });

  it('logs out and redirects to login when refresh token is missing on 401 response', async () => {
    const interceptor = responseInterceptors[0]?.error;
    expect(interceptor).toBeTypeOf('function');

    // No refresh token
    getRefreshTokenMock.mockReturnValue(null);

    const error: HttpError = {
      isAxiosError: true,
      response: { status: 401 },
      config: { _retry: false, headers: {} },
    };

    await expect(interceptor(error)).rejects.toBeInstanceOf(Error);

    expect(logoutMock).toHaveBeenCalledTimes(1);
    expect(promptLoginRequiredMock).toHaveBeenCalledWith(
      expect.objectContaining({
        messageKey: 'message.login_required',
      })
    );
    expect(replaceMock).toHaveBeenCalledWith({
      name: 'login',
      query: { redirect: '/protected' },
    });
  });
});
