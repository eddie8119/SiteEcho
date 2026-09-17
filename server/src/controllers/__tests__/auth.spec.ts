import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

import { login, logout, refresh, ssoCallback, ssoLogin } from '@/controllers/auth';
import { AppError } from '@/utils/controllerError';

const mockSupabase = vi.hoisted(() => ({
  auth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    refreshSession: vi.fn(),
    signInWithOAuth: vi.fn(),
    getUser: vi.fn(),
  },
  from: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase,
}));

const mockPickSnakeBody = vi.hoisted(() => vi.fn());

vi.mock('@/utils/bodyTransform', () => ({
  pickSnakeBody: mockPickSnakeBody,
}));

const mockHandleControllerError = vi.hoisted(() => vi.fn());

vi.mock('@/utils/controllerError', async () => {
  const actual =
    await vi.importActual<typeof import('@/utils/controllerError')>('@/utils/controllerError');
  return {
    ...actual,
    handleControllerError: mockHandleControllerError,
  };
});

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (): MockResponse =>
  ({
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  }) as unknown as MockResponse;

const createRequest = (overrides: Partial<Request> = {}) =>
  ({
    body: {},
    params: {},
    ...overrides,
  }) as Request;

const getJsonPayload = (res: MockResponse) =>
  (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];

describe('auth controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReset();
    Object.values(mockSupabase.auth).forEach((fn) => fn.mockReset());
    mockPickSnakeBody.mockReset();
    mockHandleControllerError.mockReset();
    process.env.CLIENT_URL = 'https://app.example.com';
  });

  it('login responds with tokens and user payload on success', async () => {
    mockPickSnakeBody.mockReturnValue({ email: 'jane@example.com', password: 'secret' });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'access-token', refresh_token: 'refresh-token' },
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          created_at: '2024-01-01',
          user_metadata: { name: 'Jane' },
        },
      },
      error: null,
    });

    const req = createRequest();
    const res = createMockResponse();

    await login(req, res);

    expect(mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'jane@example.com',
      password: 'secret',
    });

    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.data.access_token).toBe('access-token');
    expect(res.json).toHaveBeenCalled();
  });

  it('login delegates to handleControllerError when Supabase rejects credentials', async () => {
    mockPickSnakeBody.mockReturnValue({ email: 'bad@example.com', password: 'secret' });
    mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid creds' },
    });

    const req = createRequest();
    const res = createMockResponse();

    await login(req, res);

    expect(mockHandleControllerError).toHaveBeenCalledWith(
      res,
      expect.any(AppError),
      'Login error'
    );
  });

  it('logout returns 200 when Supabase signs out successfully', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: null });

    const req = createRequest();
    const res = createMockResponse();

    await logout(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
  });

  it('logout surfaces errors via handleControllerError', async () => {
    mockSupabase.auth.signOut.mockResolvedValue({ error: { message: 'boom' } });

    const req = createRequest();
    const res = createMockResponse();

    await logout(req, res);

    expect(mockHandleControllerError).toHaveBeenCalledWith(
      res,
      expect.any(AppError),
      'Logout error'
    );
  });

  it('refresh returns new access token', async () => {
    mockPickSnakeBody.mockReturnValue({ refresh_token: 'refresh-token' });
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: { access_token: 'new-access' } },
      error: null,
    });

    const req = createRequest();
    const res = createMockResponse();

    await refresh(req, res);

    const payload = getJsonPayload(res);
    expect(payload.data.access_token).toBe('new-access');
  });

  it('refresh calls handleControllerError when Supabase rejects token', async () => {
    mockPickSnakeBody.mockReturnValue({ refresh_token: 'bad-token' });
    mockSupabase.auth.refreshSession.mockResolvedValue({
      data: { session: null },
      error: { message: 'invalid' },
    });

    const req = createRequest();
    const res = createMockResponse();

    await refresh(req, res);

    expect(mockHandleControllerError).toHaveBeenCalledWith(
      res,
      expect.any(AppError),
      'Refresh token error'
    );
  });

  it('ssoLogin returns provider URL from Supabase', async () => {
    mockSupabase.auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://supabase.app/oauth' },
      error: null,
    });

    const req = createRequest({ params: { provider: 'google' } });
    const res = createMockResponse();

    await ssoLogin(req as Request, res);

    expect(mockSupabase.auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: 'https://app.example.com/auth/sso/callback',
        skipBrowserRedirect: false,
      },
    });

    const payload = getJsonPayload(res);
    expect(payload.data.url).toBe('https://supabase.app/oauth');
  });

  it('ssoLogin rejects unsupported providers', async () => {
    const req = createRequest({ params: { provider: 'github' } });
    const res = createMockResponse();

    await ssoLogin(req as Request, res);

    expect(mockHandleControllerError).toHaveBeenCalledWith(
      res,
      expect.any(AppError),
      'SSO login error'
    );
  });

  it('ssoCallback creates profile when missing and returns tokens', async () => {
    mockPickSnakeBody.mockReturnValue({ access_token: 'access-123', refresh_token: 'refresh-123' });
    mockSupabase.auth.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          created_at: '2024-01-01',
          user_metadata: { name: 'Jane', avatar_url: 'avatar.png', full_name: undefined },
          app_metadata: { provider: 'google' },
        },
      },
      error: null,
    });

    const profileQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    } as const;

    mockSupabase.from.mockReturnValue(
      profileQuery as unknown as ReturnType<typeof mockSupabase.from>
    );

    const req = createRequest({ params: { provider: 'google' } });
    const res = createMockResponse();

    await ssoCallback(req as Request, res);

    expect(profileQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-1', email: 'jane@example.com' })
    );
    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.data.user.email).toBe('jane@example.com');
    expect(payload.data.access_token).toBe('access-123');
  });
});
