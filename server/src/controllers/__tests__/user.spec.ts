import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

import { getCurrentUser, register, updateUser } from '@/controllers/user';

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  auth: {
    admin: {
      createUser: vi.fn(),
      inviteUserByEmail: vi.fn(),
      deleteUser: vi.fn(),
    },
    updateUser: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    signInWithPassword: vi.fn(),
    verifyOtp: vi.fn(),
  },
}));

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
  supabaseAdmin: mockSupabase,
}));

vi.mock('@/utils/storageGuard', () => ({
  checkIsUserPaid: vi.fn().mockResolvedValue(false),
}));

const mockPickSnakeBody = vi.hoisted(() => vi.fn());

vi.mock('@/utils/bodyTransform', () => ({
  pickSnakeBody: mockPickSnakeBody,
}));

const mockSanitizeAndCamelcase = vi.hoisted(() =>
  vi.fn((record: Record<string, unknown> | null | undefined) =>
    record ? { ...record, sanitized: true } : null
  )
);

vi.mock('@/utils/formatters', () => ({
  sanitizeAndCamelcase: mockSanitizeAndCamelcase,
}));

type MockResponse = Response & {
  status: ReturnType<typeof vi.fn>;
  json: ReturnType<typeof vi.fn>;
};

const createMockResponse = (): MockResponse => {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as MockResponse;
};

type RequestOverrides = Partial<Request> & {
  user?: {
    id: string;
    email: string;
  };
};

const createRequest = (overrides: RequestOverrides = {}) => {
  return {
    body: {},
    params: {},
    user: { id: 'user-123', email: 'jane@example.com' },
    ...overrides,
  } as Request;
};

const getJsonPayload = (res: MockResponse) => {
  return (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
};

describe('user controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CLIENT_URL = 'https://app.example.com';
  });

  it('register creates auth user and sends invitation email', async () => {
    mockPickSnakeBody.mockReturnValue({
      email: 'jane@example.com',
      password: 'secret123',
      name: 'Jane Doe',
    });

    mockSupabase.auth.admin.createUser.mockResolvedValue({
      data: { user: { id: 'user-123', email: 'jane@example.com' } },
      error: null,
    });

    const profileInsertQuery = {
      insert: vi.fn().mockResolvedValue({ error: null }),
    };

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'Profiles') return profileInsertQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    mockSupabase.auth.admin.inviteUserByEmail.mockResolvedValue({ error: null });

    const req = createRequest();
    const res = createMockResponse();

    await register(req, res);

    expect(mockSupabase.auth.admin.createUser).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com', password: 'secret123' })
    );
    expect(mockSupabase.from).toHaveBeenCalledWith('Profiles');
    expect(profileInsertQuery.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'user-123', email: 'jane@example.com' })
    );
    expect(mockSupabase.auth.admin.inviteUserByEmail).toHaveBeenCalledWith(
      'jane@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining('/auth/account-activation') })
    );
    expect(res.status).toHaveBeenCalledWith(201);

    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.data.userId).toBe('user-123');
    expect(payload.data.emailSent).toBe(true);
  });

  it('getCurrentUser returns current user with paid status', async () => {
    const req = createRequest();
    const res = createMockResponse();

    await getCurrentUser(req, res);

    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.data.user).toMatchObject({
      id: 'user-123',
      email: 'jane@example.com',
      ispaid: false,
    });
  });

  it('updateUser returns message that metadata should be updated via Supabase Auth', async () => {
    const req = createRequest();
    const res = createMockResponse();

    await updateUser(req, res);

    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.data.user).toMatchObject({
      id: 'user-123',
      email: 'jane@example.com',
    });
    expect(payload.message).toContain('Supabase Auth API');
  });
});
