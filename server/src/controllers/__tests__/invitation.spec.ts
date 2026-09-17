import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthenticatedRequest } from '@/types/requests';
import type { Request, Response } from 'express';

import {
  acceptInvitation,
  createProjectInvitation,
  getInvitationByToken,
} from '@/controllers/invitation';

const mockFrom = vi.hoisted(() => vi.fn());
const mockGetUserById = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
  supabaseAdmin: {
    from: mockFrom,
    auth: {
      admin: {
        getUserById: mockGetUserById,
      },
    },
  },
}));

const createMockProjectQuery = (projectData: unknown) => ({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  single: vi
    .fn()
    .mockResolvedValue({ data: projectData, error: projectData ? null : { message: 'Not found' } }),
  maybeSingle: vi.fn().mockResolvedValue({ data: projectData, error: null }),
});

const defaultProfilesQuery = () => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
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
    userId: 'user-1',
    params: {},
    body: {},
    headers: {},
    ...overrides,
  }) as unknown as AuthenticatedRequest & Request;

describe('Invitation Controller - Boundary & Entitlement Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUserById.mockReset();
    process.env.CLIENT_URL = 'https://SiteNear.app';
  });

  describe('createProjectInvitation', () => {
    it('rejects if projectId is missing', async () => {
      const req = createAuthRequest({ params: {} });
      const res = createMockResponse();

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'PROJECT_ID_REQUIRED',
      });
    });

    it('rejects if caller is not the project owner', async () => {
      const req = createAuthRequest({
        userId: 'not-owner',
        params: { projectId: 'project-1' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'Projects') {
          return createMockProjectQuery(null);
        }
        return {};
      });

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'PROJECT_NOT_FOUND',
      });
    });

    it('rejects if project owner is not Pro subscriber', async () => {
      const req = createAuthRequest({
        userId: 'owner-free',
        params: { projectId: 'project-1' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'Projects') {
          return createMockProjectQuery({ id: 'project-1', user_id: 'owner-free' });
        }
        if (table === 'Profiles') {
          return defaultProfilesQuery();
        }
        if (table === 'UserSubscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'PRO_REQUIRED',
      });
    });

    it('rejects if project already reached 5 members (owner + 4 collaborators)', async () => {
      const req = createAuthRequest({
        userId: 'owner-pro',
        params: { projectId: 'project-1' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'Projects') {
          return createMockProjectQuery({ id: 'project-1', user_id: 'owner-pro' });
        }
        if (table === 'Profiles') {
          return defaultProfilesQuery();
        }
        if (table === 'UserSubscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'sub-1', status: 'active' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
                error: null,
              }),
            }),
          };
        }
        return {};
      });

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'MAX_COLLABORATORS_REACHED',
      });
    });

    it('successfully creates invitation token for Pro owner with < 5 members', async () => {
      const req = createAuthRequest({
        userId: 'owner-pro',
        params: { projectId: 'project-1' },
      });
      const res = createMockResponse();

      const mockCreatedInvite = {
        id: 'invite-1',
        project_id: 'project-1',
        inviter_id: 'owner-pro',
        token: 'mock-uuid-token-1234',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'Projects') {
          return createMockProjectQuery({ id: 'project-1', user_id: 'owner-pro' });
        }
        if (table === 'Profiles') {
          return defaultProfilesQuery();
        }
        if (table === 'UserSubscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { id: 'sub-1', status: 'active' },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: '1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'ProjectInvitations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedInvite,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = getJsonPayload(res);
      expect(payload.success).toBe(true);
      expect(payload.data).toHaveProperty('token', 'mock-uuid-token-1234');
      expect(payload.data).toHaveProperty(
        'invitationUrl',
        'https://SiteNear.app/invite/mock-uuid-token-1234'
      );
    });

    it('successfully creates invitation token when owner has Profiles.is_paid = true (manual override)', async () => {
      const req = createAuthRequest({
        userId: 'owner-paid-profile',
        params: { projectId: 'project-1' },
      });
      const res = createMockResponse();

      const mockCreatedInvite = {
        id: 'invite-2',
        project_id: 'project-1',
        inviter_id: 'owner-paid-profile',
        token: 'mock-uuid-token-5678',
        status: 'pending',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_at: new Date().toISOString(),
      };

      mockFrom.mockImplementation((table: string) => {
        if (table === 'Projects') {
          return createMockProjectQuery({ id: 'project-1', user_id: 'owner-paid-profile' });
        }
        if (table === 'Profiles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { is_paid: true, is_developer: false },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'UserSubscriptions') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: null,
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: '1' }],
                error: null,
              }),
            }),
          };
        }
        if (table === 'ProjectInvitations') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockCreatedInvite,
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await createProjectInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      const payload = getJsonPayload(res);
      expect(payload.success).toBe(true);
      expect(payload.data).toHaveProperty('token', 'mock-uuid-token-5678');
      expect(payload.data).toHaveProperty(
        'invitationUrl',
        'https://SiteNear.app/invite/mock-uuid-token-5678'
      );
    });
  });

  describe('getInvitationByToken', () => {
    it('returns 404 for nonexistent token', async () => {
      const req = createAuthRequest({ params: { token: 'nonexistent-token' } });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          };
        }
        return {};
      });

      await getInvitationByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'INVITATION_NOT_FOUND',
      });
    });

    it('returns 410 if token is expired', async () => {
      const req = createAuthRequest({ params: { token: 'expired-token' } });
      const res = createMockResponse();

      const expiredDate = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    token: 'expired-token',
                    status: 'pending',
                    expires_at: expiredDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await getInvitationByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'INVITATION_EXPIRED',
      });
    });

    it('returns 410 if token is already accepted', async () => {
      const req = createAuthRequest({ params: { token: 'used-token' } });
      const res = createMockResponse();

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    token: 'used-token',
                    status: 'accepted',
                    expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await getInvitationByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(410);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'INVITATION_ALREADY_ACCEPTED',
      });
    });

    it('returns invitation details with project and inviter name when valid', async () => {
      const req = createAuthRequest({ params: { token: 'valid-token' } });
      const res = createMockResponse();

      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
      mockGetUserById.mockResolvedValue({
        data: {
          user: {
            id: 'user-owner',
            email: 'alice@example.com',
            user_metadata: { name: 'Alice Smith' },
          },
        },
        error: null,
      });
      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    project_id: 'proj-1',
                    inviter_id: 'user-owner',
                    token: 'valid-token',
                    status: 'pending',
                    expires_at: futureDate,
                    accepted_at: null,
                    created_at: new Date().toISOString(),
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'Projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { name: 'Construction Project A' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await getInvitationByToken(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const payload = getJsonPayload(res);
      expect(payload.success).toBe(true);
      expect(payload.data).toMatchObject({
        token: 'valid-token',
        projectName: 'Construction Project A',
        inviterName: 'Alice Smith',
        status: 'pending',
      });
    });
  });

  describe('acceptInvitation - Boundary Conditions', () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();

    it('rejects if user is already a member (ALREADY_MEMBER)', async () => {
      const req = createAuthRequest({
        userId: 'collaborator-1',
        params: { token: 'valid-token' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    project_id: 'project-1',
                    inviter_id: 'owner-1',
                    token: 'valid-token',
                    status: 'pending',
                    expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: { id: 'collab-existing' },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        return {};
      });

      await acceptInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'ALREADY_MEMBER',
      });
    });

    it('rejects if caller is the project owner clicking their own invite (IS_OWNER)', async () => {
      const req = createAuthRequest({
        userId: 'owner-1',
        params: { token: 'valid-token' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    project_id: 'project-1',
                    inviter_id: 'owner-1',
                    token: 'valid-token',
                    status: 'pending',
                    expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === 'Projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'owner-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await acceptInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(getJsonPayload(res)).toMatchObject({
        code: 'IS_OWNER',
      });
    });

    it('successfully accepts invitation and joins project as member', async () => {
      const req = createAuthRequest({
        userId: 'new-user-2',
        params: { token: 'valid-token' },
      });
      const res = createMockResponse();

      mockFrom.mockImplementation((table: string) => {
        if (table === 'ProjectInvitations') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'invite-1',
                    project_id: 'project-1',
                    inviter_id: 'owner-1',
                    token: 'valid-token',
                    status: 'pending',
                    expires_at: futureDate,
                  },
                  error: null,
                }),
              }),
            }),
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        if (table === 'ProjectCollaborators') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({
                    data: null,
                    error: null,
                  }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'collab-new',
                    project_id: 'project-1',
                    owner_id: 'owner-1',
                    collaborator_user_id: 'new-user-2',
                    role: 'member',
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        if (table === 'Projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: { user_id: 'owner-1' },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      await acceptInvitation(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(getJsonPayload(res)).toMatchObject({
        success: true,
        data: {
          projectId: 'project-1',
        },
      });
    });
  });
});
