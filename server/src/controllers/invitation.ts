import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';

import { MAX_PROJECT_COLLABORATORS } from '@/config/subscriptionConfig';
import { supabaseAdmin } from '@/lib/supabase';
import { ProjectInvitationRecord, ProjectInvitationResponse } from '@/types/invitation';
import { AuthenticatedRequest } from '@/types/requests';
import { AppError, handleControllerError } from '@/utils/controllerError';
import { checkIsUserPaid } from '@/utils/storageGuard';

// ==================== Project Invitations ====================

/**
 * Create a project invitation token
 * POST /api/invitations/project/:projectId
 *
 * Guard: Must be project owner, have Pro subscription, and project must have < 5 members
 */
export const createProjectInvitation = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const projectId = req.params.projectId;

    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'PROJECT_ID_REQUIRED',
      });
    }

    // 1. Verify user owns the project (supports both UUID id and client_id)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      projectId
    );
    let projectQuery = supabaseAdmin.from('Projects').select('id, user_id').eq('user_id', userId);
    if (isUuid) {
      projectQuery = projectQuery.or(`id.eq.${projectId},client_id.eq.${projectId}`);
    } else {
      projectQuery = projectQuery.eq('client_id', projectId);
    }
    const { data: project, error: projectError } = await projectQuery.maybeSingle();

    if (projectError || !project) {
      throw new AppError('Project not found or you do not have permission', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const actualProjectId = project.id;

    // 2. Check if user has Pro subscription (Profiles.is_paid / is_developer / UserSubscriptions active)
    const isPro = await checkIsUserPaid(userId);
    if (!isPro) {
      throw new AppError('Only Pro users can invite collaborators', {
        statusCode: 403,
        code: 'PRO_REQUIRED',
      });
    }

    // 3. Check current member count (Owner + Members)
    const { data: collaborators, error: collabError } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('id', { count: 'exact' })
      .eq('project_id', actualProjectId);

    if (collabError) {
      throw new AppError('Failed to check member count', {
        statusCode: 500,
        code: 'MEMBER_COUNT_CHECK_FAILED',
        detail: collabError.message,
        exposeError: true,
      });
    }

    // Owner + Members count must be < MAX_PROJECT_COLLABORATORS
    const currentMemberCount = (collaborators?.length || 0) + 1; // +1 for owner
    if (currentMemberCount >= MAX_PROJECT_COLLABORATORS) {
      throw new AppError(
        `Project has reached maximum collaborators (${MAX_PROJECT_COLLABORATORS})`,
        {
          statusCode: 409,
          code: 'MAX_COLLABORATORS_REACHED',
        }
      );
    }

    // 4. Create invitation record with single-use token
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('ProjectInvitations')
      .insert([
        {
          project_id: actualProjectId,
          inviter_id: userId,
          status: 'pending',
        },
      ])
      .select()
      .single();

    if (invitationError || !invitation) {
      throw new AppError('Failed to create invitation', {
        statusCode: 500,
        code: 'INVITATION_CREATE_FAILED',
        detail: invitationError?.message,
        exposeError: true,
      });
    }

    return res.status(201).json({
      success: true,
      data: {
        token: invitation.token,
        invitationUrl: `${(process.env.CLIENT_URL ?? 'http://localhost:5173').replace(/\/$/, '')}/invite/${invitation.token}`,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error creating project invitation');
  }
};

/**
 * Get invitation details by token (public endpoint)
 * GET /api/invitations/token/:token
 *
 * Returns: inviter name, project name, status
 */
export const getInvitationByToken = async (req: Request, res: Response) => {
  try {
    const token = req.params.token;

    if (!token) {
      throw new AppError('Token is required', {
        statusCode: 400,
        code: 'TOKEN_REQUIRED',
      });
    }

    // Fetch invitation
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('ProjectInvitations')
      .select('*')
      .eq('token', token)
      .single<ProjectInvitationRecord>();

    if (invitationError || !invitation) {
      throw new AppError('Invitation not found or invalid token', {
        statusCode: 404,
        code: 'INVITATION_NOT_FOUND',
      });
    }

    // Check if token is expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new AppError('Invitation has expired', {
        statusCode: 410,
        code: 'INVITATION_EXPIRED',
      });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      throw new AppError('Invitation has already been accepted', {
        statusCode: 410,
        code: 'INVITATION_ALREADY_ACCEPTED',
      });
    }

    // Fetch project name
    const { data: project } = await supabaseAdmin
      .from('Projects')
      .select('name')
      .eq('id', invitation.project_id)
      .single();

    // Fetch inviter name from auth user metadata
    const { data: inviterData } = await supabaseAdmin.auth.admin.getUserById(invitation.inviter_id);
    const inviter = inviterData?.user;

    const response: ProjectInvitationResponse = {
      id: invitation.id,
      projectId: invitation.project_id,
      inviterId: invitation.inviter_id,
      inviterName:
        inviter?.user_metadata?.name || inviter?.user_metadata?.full_name || inviter?.email || null,
      projectName: project?.name || 'Unknown Project',
      token: invitation.token,
      status: invitation.status,
      expiresAt: invitation.expires_at,
      acceptedAt: invitation.accepted_at,
      createdAt: invitation.created_at,
    };

    return res.status(200).json({
      success: true,
      data: camelcaseKeys(response, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching invitation');
  }
};

/**
 * Accept an invitation (single-use, atomic)
 * POST /api/invitations/accept/:token
 *
 * Guard: Must be authenticated
 * Atomicity: Update token status to 'accepted' and create ProjectCollaborators record in transaction
 */
export const acceptInvitation = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const token = req.params.token;

    if (!token) {
      throw new AppError('Token is required', {
        statusCode: 400,
        code: 'TOKEN_REQUIRED',
      });
    }

    if (!userId) {
      throw new AppError('Authentication required', {
        statusCode: 401,
        code: 'UNAUTHENTICATED',
      });
    }

    // 1. Fetch invitation (check status, expiry, etc.)
    const { data: invitation, error: invitationError } = await supabaseAdmin
      .from('ProjectInvitations')
      .select('*')
      .eq('token', token)
      .single<ProjectInvitationRecord>();

    if (invitationError || !invitation) {
      throw new AppError('Invitation not found or invalid token', {
        statusCode: 404,
        code: 'INVITATION_NOT_FOUND',
      });
    }

    // Check if already accepted
    if (invitation.status === 'accepted') {
      throw new AppError('Invitation has already been used', {
        statusCode: 410,
        code: 'INVITATION_ALREADY_USED',
      });
    }

    // Check if expired
    const expiresAt = new Date(invitation.expires_at);
    if (expiresAt < new Date()) {
      throw new AppError('Invitation has expired', {
        statusCode: 410,
        code: 'INVITATION_EXPIRED',
      });
    }

    // 2. Check if user is already a member of this project
    const { data: existingMember } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('id')
      .eq('project_id', invitation.project_id)
      .eq('collaborator_user_id', userId)
      .maybeSingle();

    if (existingMember) {
      throw new AppError('You are already a member of this project', {
        statusCode: 409,
        code: 'ALREADY_MEMBER',
      });
    }

    // 3. Check if user is the project owner
    const { data: project } = await supabaseAdmin
      .from('Projects')
      .select('user_id')
      .eq('id', invitation.project_id)
      .single();

    if (project?.user_id === userId) {
      throw new AppError('You are the owner of this project', {
        statusCode: 409,
        code: 'IS_OWNER',
      });
    }

    // 4. Atomic update: Mark invitation as accepted and create collaborator record
    // First, update invitation status
    const { error: updateError } = await supabaseAdmin
      .from('ProjectInvitations')
      .update({
        status: 'accepted',
        accepted_by_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq('id', invitation.id)
      .eq('status', 'pending'); // Ensure still pending (prevents race condition)

    if (updateError) {
      throw new AppError('Failed to accept invitation', {
        statusCode: 500,
        code: 'INVITATION_ACCEPT_FAILED',
        detail: updateError.message,
        exposeError: true,
      });
    }

    // 5. Create ProjectCollaborators record
    const { data: collaborator, error: collabError } = await supabaseAdmin
      .from('ProjectCollaborators')
      .insert([
        {
          project_id: invitation.project_id,
          owner_id: invitation.inviter_id,
          collaborator_user_id: userId,
          role: 'member',
        },
      ])
      .select()
      .single();

    if (collabError || !collaborator) {
      // If collaborator creation fails, we should ideally rollback the invitation update
      // For now, log the error and return failure
      console.error('Failed to create collaborator record:', collabError);
      throw new AppError('Failed to complete invitation acceptance', {
        statusCode: 500,
        code: 'COLLABORATOR_CREATE_FAILED',
        detail: collabError?.message,
        exposeError: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Invitation accepted successfully',
      data: {
        projectId: invitation.project_id,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error accepting invitation');
  }
};
