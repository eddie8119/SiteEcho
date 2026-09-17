import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '@/types/requests';
import type { Request, Response } from 'express';

import {
  addProjectCollaborator,
  getProjectCollaborators,
  removeProjectCollaborator,
} from '@/controllers/collaborator';
import { AppError } from '@/utils/controllerError';

const mockFrom = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  supabaseAdmin: {
    from: mockFrom,
  },
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

const getJsonPayload = (res: MockResponse) =>
  (res.json as unknown as ReturnType<typeof vi.fn>).mock.calls[0]?.[0];

const createAuthRequest = (overrides: Partial<AuthenticatedRequest> = {}) =>
  ({
    userId: 'owner-1',
    params: {},
    body: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest & Request;

const createSelectSingleQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.or.mockReturnValue(query);
  return query;
};

const createSelectEqQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    select: vi.fn(),
    eq: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  return query;
};

const createSelectInQuery = (result: { data: unknown; error: unknown }) => {
  const query = {
    select: vi.fn(),
    in: vi.fn().mockResolvedValue(result),
  };
  query.select.mockReturnValue(query);
  return query;
};

const createDeleteQuery = (result: { error: unknown }) => {
  const query = {
    delete: vi.fn(),
    eq: vi.fn(),
  } as { delete: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> };

  query.delete.mockReturnValue(query);
  query.eq
    .mockReturnValueOnce(query) // first eq('id', ...)
    .mockResolvedValueOnce(result); // second eq('project_id', ...)

  return query;
};

describe('collaborator controllers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReset();
    mockPickSnakeBody.mockReset();
    mockHandleControllerError.mockReset();
  });

  it('getProjectCollaborators merges project and global collaborators with names', async () => {
    const projectQuery = createSelectSingleQuery({
      data: { id: 'proj-1', user_id: 'owner-1' },
      error: null,
    });

    const projectCollaboratorsQuery = createSelectEqQuery({
      data: [
        {
          id: 'pc-1',
          project_id: 'proj-1',
          owner_id: 'owner-1',
          collaborator_email: 'project@example.com',
          collaborator_user_id: 'user-999',
          role: 'editor',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ],
      error: null,
    });

    const globalCollaboratorsQuery = createSelectEqQuery({
      data: [
        {
          id: 'gc-1',
          collaborator_email: 'global@example.com',
          role: 'viewer',
          owner_id: 'owner-1',
          created_at: '2024-02-01T00:00:00Z',
          updated_at: '2024-02-01T00:00:00Z',
        },
      ],
      error: null,
    });

    const profilesQuery = createSelectInQuery({
      data: [
        { id: 'user-999', email: 'project@example.com', name: 'Project User' },
        { id: 'user-888', email: 'global@example.com', name: 'Global User' },
      ],
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      switch (table) {
        case 'Projects':
          return projectQuery;
        case 'ProjectCollaborators':
          return projectCollaboratorsQuery;
        case 'GlobalCollaborators':
          return globalCollaboratorsQuery;
        case 'Profiles':
        case 'Users':
          return profilesQuery;
        default:
          throw new Error(`Unexpected table ${table}`);
      }
    });

    const req = createAuthRequest({ params: { projectId: 'proj-1' } });
    const res = createMockResponse();

    await getProjectCollaborators(req as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = getJsonPayload(res) as {
      success: boolean;
      data: Array<{
        collaboratorEmail: string;
        collaboratorName: string | null;
        role: string;
        isGlobal: boolean;
      }>;
    };
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(2);
    const projectEntry = payload.data.find((c) => c.collaboratorEmail === 'project@example.com');
    const globalEntry = payload.data.find((c) => c.collaboratorEmail === 'global@example.com');
    expect(projectEntry).toMatchObject({
      role: 'editor',
      collaboratorName: 'Project User',
      isGlobal: false,
    });
    expect(globalEntry).toMatchObject({
      role: 'viewer',
      collaboratorName: 'Global User',
      isGlobal: true,
    });
  });

  it('addProjectCollaborator delegates errors when collaborator already exists', async () => {
    mockPickSnakeBody.mockReturnValue({ collaborator_email: 'guest@example.com', role: 'viewer' });

    const projectQuery = createSelectSingleQuery({
      data: { id: 'proj-1', user_id: 'owner-1' },
      error: null,
    });

    const existingCollaboratorQuery = createSelectSingleQuery({
      data: { id: 'existing' },
      error: null,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'Projects') return projectQuery;
      if (table === 'ProjectCollaborators') return existingCollaboratorQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const req = createAuthRequest({ params: { projectId: 'proj-1' } });
    const res = createMockResponse();

    await addProjectCollaborator(req as Request, res);

    expect(mockHandleControllerError).toHaveBeenCalledWith(
      res,
      expect.any(AppError),
      'Unexpected error adding project collaborator'
    );
  });

  it('removeProjectCollaborator deletes collaborator and returns success', async () => {
    const projectQuery = createSelectSingleQuery({
      data: { id: 'proj-1', user_id: 'owner-1' },
      error: null,
    });
    const deleteQuery = createDeleteQuery({ error: null });

    mockFrom.mockImplementation((table: string) => {
      if (table === 'Projects') return projectQuery;
      if (table === 'ProjectCollaborators') return deleteQuery;
      throw new Error(`Unexpected table ${table}`);
    });

    const req = createAuthRequest({ params: { projectId: 'proj-1', collaboratorId: 'col-1' } });
    const res = createMockResponse();

    await removeProjectCollaborator(req as Request, res);

    expect(res.status).toHaveBeenCalledWith(200);
    const payload = getJsonPayload(res);
    expect(payload.success).toBe(true);
    expect(payload.message).toContain('removed');
    expect(mockHandleControllerError).not.toHaveBeenCalled();
  });
});
