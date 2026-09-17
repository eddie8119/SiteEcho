import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';

import { supabaseAdmin } from '@/lib/supabase';
import {
  GlobalCollaboratorRecord,
  MergedCollaboratorRecord,
  ProjectCollaboratorRecord,
} from '@/types/collaborator';
import { GlobalCollaboratorSnakeBody, ProjectCollaboratorSnakeBody } from '@/types/requestBody';
import { AuthenticatedRequest } from '@/types/requests';
import { pickSnakeBody } from '@/utils/bodyTransform';
import { AppError, handleControllerError } from '@/utils/controllerError';

const PROJECT_COLLAB_FIELDS = [
  'collaborator_email',
  'role',
] as const satisfies readonly (keyof ProjectCollaboratorSnakeBody & string)[];

const GLOBAL_COLLAB_FIELDS = [
  'collaborator_email',
  'role',
] as const satisfies readonly (keyof GlobalCollaboratorSnakeBody & string)[];

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Resolve a project by its server id or client_id (used by all project-collaborator handlers)
const resolveProjectByIdOrClientId = async (projectId: string, userId?: string) => {
  const isUuid = UUID_REGEX.test(projectId);

  // 1. Try finding by server primary key `id` first (guaranteed unique if found)
  if (isUuid) {
    const { data: byId, error: idError } = await supabaseAdmin
      .from('Projects')
      .select('id, user_id, client_id')
      .eq('id', projectId)
      .maybeSingle();

    if (byId) {
      return { data: byId, error: null };
    }
    if (idError && idError.code !== 'PGRST116') {
      return { data: null, error: idError };
    }
  }

  // 2. Try finding by `client_id` (prefer matching user_id if provided)
  if (userId) {
    const { data: byClientAndUser, error: clientUserError } = await supabaseAdmin
      .from('Projects')
      .select('id, user_id, client_id')
      .eq('client_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (byClientAndUser) {
      return { data: byClientAndUser, error: null };
    }
    if (clientUserError && clientUserError.code !== 'PGRST116') {
      return { data: null, error: clientUserError };
    }
  }

  // 3. Fallback: search by client_id (limit 1 to prevent multiple rows error)
  const { data: byClientList, error: clientError } = await supabaseAdmin
    .from('Projects')
    .select('id, user_id, client_id')
    .eq('client_id', projectId)
    .limit(1);

  if (clientError) {
    return { data: null, error: clientError };
  }

  if (byClientList && byClientList.length > 0) {
    return { data: byClientList[0], error: null };
  }

  return { data: null, error: null };
};

// ==================== Project Collaborators ====================

// Get all collaborators for a specific project (includes global collaborators if table exists)
export const getProjectCollaborators = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const projectId = req.params.projectId;

    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'PROJECT_ID_REQUIRED',
      });
    }

    // Fetch project by server id or client_id; use admin client to bypass RLS for collaborators
    const { data: project, error: projectError } = await resolveProjectByIdOrClientId(
      projectId,
      userId
    );

    if (projectError || !project) {
      throw new AppError('Project not found', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const actualProjectId = project.id;

    // Get project-specific collaborators for this project.
    const { data: projectCollaborators, error: projectCollabError } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('*')
      .eq('project_id', actualProjectId);

    if (projectCollabError) {
      console.error('Error fetching project collaborators:', projectCollabError);
      throw new AppError('Failed to fetch project collaborators', {
        statusCode: 500,
        code: 'PROJECT_COLLAB_FETCH_FAILED',
        detail: projectCollabError.message,
        exposeError: true,
      });
    }

    const isOwnerView = project.user_id === userId;
    const isCollaboratorView = (projectCollaborators || []).some(
      (pc: ProjectCollaboratorRecord) =>
        pc.collaborator_user_id && pc.collaborator_user_id === userId
    );

    if (!isOwnerView && !isCollaboratorView) {
      throw new AppError('You do not have permission to view collaborators for this project', {
        statusCode: 403,
        code: 'PROJECT_COLLAB_FORBIDDEN',
      });
    }

    // Get global collaborators for this owner safely (table might not exist in V1 schema)
    let globalCollaborators: GlobalCollaboratorRecord[] = [];
    try {
      const { data: globalData, error: globalError } = await supabaseAdmin
        .from('GlobalCollaborators')
        .select('*')
        .eq('owner_id', project.user_id);

      if (!globalError && globalData) {
        globalCollaborators = globalData;
      }
    } catch {
      // Ignore if GlobalCollaborators table does not exist
    }

    // Collect collaborator emails and user IDs to resolve names from Profiles table
    const collaboratorEmails = [
      ...(projectCollaborators || []).map((pc: ProjectCollaboratorRecord) => pc.collaborator_email),
      ...globalCollaborators.map((gc: GlobalCollaboratorRecord) => gc.collaborator_email),
    ].filter(Boolean) as string[];

    const collaboratorUserIds = (projectCollaborators || [])
      .map((pc: ProjectCollaboratorRecord) => pc.collaborator_user_id)
      .filter(Boolean) as string[];

    const userInfoMap = await buildUserInfoMap(collaboratorEmails, collaboratorUserIds);

    // Create a map of project collaborators by email for quick lookup
    const projectCollabMap = new Map(
      (projectCollaborators || []).map((pc: ProjectCollaboratorRecord) => [
        pc.collaborator_email || pc.collaborator_user_id,
        pc,
      ])
    );

    // Merge collaborators: project-specific override global
    const mergedCollaborators: MergedCollaboratorRecord[] = [];

    // Add all project-specific collaborators
    (projectCollaborators || []).forEach((pc: ProjectCollaboratorRecord) => {
      const info = pc.collaborator_user_id
        ? userInfoMap.get(pc.collaborator_user_id)
        : pc.collaborator_email
          ? userInfoMap.get(pc.collaborator_email)
          : null;
      const resolvedEmail = pc.collaborator_email || info?.email || '';
      const displayName = info?.name || resolvedEmail || pc.collaborator_user_id || '';

      mergedCollaborators.push({
        id: pc.id,
        project_id: pc.project_id,
        owner_id: pc.owner_id,
        collaborator_email: resolvedEmail,
        collaborator_name: displayName,
        role: pc.role,
        is_global: false,
        global_role: null,
        created_at: pc.created_at,
        updated_at: pc.updated_at,
      });
    });

    // Add global collaborators (if not overridden by project-specific)
    globalCollaborators.forEach((gc: GlobalCollaboratorRecord) => {
      const projectCollab = projectCollabMap.get(gc.collaborator_email);
      if (projectCollab) {
        // Update existing entry to include global role info
        const existing = mergedCollaborators.find(
          (c) => c.collaborator_email === gc.collaborator_email
        );
        if (existing) {
          existing.is_global = true;
          existing.global_role = gc.role;
        }
      } else {
        // Add as global collaborator
        const info = userInfoMap.get(gc.collaborator_email);
        mergedCollaborators.push({
          id: gc.id,
          project_id: actualProjectId,
          owner_id: project.user_id,
          collaborator_email: gc.collaborator_email || info?.email || '',
          collaborator_name: info?.name || gc.collaborator_email || '',
          role: gc.role,
          is_global: true,
          global_role: gc.role,
          created_at: gc.created_at,
          updated_at: gc.updated_at,
        });
      }
    });

    // Sort by created_at descending
    mergedCollaborators.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json({
      success: true,
      data: camelcaseKeys(mergedCollaborators, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching project collaborators');
  }
};

// Get all global collaborators for the authenticated user
export const getGlobalCollaborators = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    let collaborators: GlobalCollaboratorRecord[] = [];
    try {
      const { data, error } = await supabaseAdmin
        .from('GlobalCollaborators')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        collaborators = data;
      }
    } catch {
      // Table may not exist
    }

    const collaboratorEmails = (collaborators || []).map(
      (gc: GlobalCollaboratorRecord) => gc.collaborator_email
    );
    const userNameMap = await buildUserNameMapByEmails(collaboratorEmails);

    const enrichedCollaborators = (collaborators || []).map((gc: GlobalCollaboratorRecord) => ({
      ...gc,
      collaborator_name: userNameMap.get(gc.collaborator_email) ?? null,
    }));

    return res.status(200).json({
      success: true,
      data: camelcaseKeys(enrichedCollaborators, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching global collaborators');
  }
};

// Get all collaborators across all projects owned by the user
export const getAllProjectCollaborators = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    // Get all project-specific collaborators where current user is owner.
    const { data: projectCollaborators, error: projectError } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('*')
      .eq('owner_id', userId);

    if (projectError) {
      console.error('Error fetching project collaborators:', projectError);
      throw new AppError('Failed to fetch project collaborators', {
        statusCode: 500,
        code: 'PROJECT_COLLAB_FETCH_FAILED',
        detail: projectError.message,
        exposeError: true,
      });
    }

    // Get global collaborators safely
    let globalCollaborators: GlobalCollaboratorRecord[] = [];
    try {
      const { data: globalData, error: globalError } = await supabaseAdmin
        .from('GlobalCollaborators')
        .select('*')
        .eq('owner_id', userId);

      if (!globalError && globalData) {
        globalCollaborators = globalData;
      }
    } catch {
      // Ignore if table doesn't exist
    }

    // Collect collaborator emails and user IDs to resolve names
    const collaboratorEmails = [
      ...(projectCollaborators || []).map((pc: ProjectCollaboratorRecord) => pc.collaborator_email),
      ...globalCollaborators.map((gc: GlobalCollaboratorRecord) => gc.collaborator_email),
    ].filter(Boolean) as string[];

    const collaboratorUserIds = (projectCollaborators || [])
      .map((pc: ProjectCollaboratorRecord) => pc.collaborator_user_id)
      .filter(Boolean) as string[];

    const userNameMap = await buildUserNameMap(collaboratorEmails, collaboratorUserIds);

    // Create a map of project collaborators for quick lookup
    const projectCollabMap = new Map(
      (projectCollaborators || []).map((pc: ProjectCollaboratorRecord) => [
        pc.collaborator_email || pc.collaborator_user_id,
        pc,
      ])
    );

    // Merge collaborators: project-specific override global
    const mergedCollaborators: MergedCollaboratorRecord[] = [];

    // Add all project-specific collaborators
    (projectCollaborators || []).forEach((pc: ProjectCollaboratorRecord) => {
      const displayName =
        (pc.collaborator_user_id ? userNameMap.get(pc.collaborator_user_id) : null) ||
        (pc.collaborator_email ? userNameMap.get(pc.collaborator_email) : null) ||
        pc.collaborator_email ||
        null;

      mergedCollaborators.push({
        id: pc.id,
        project_id: pc.project_id,
        owner_id: pc.owner_id,
        collaborator_email: pc.collaborator_email || '',
        collaborator_name: displayName,
        role: pc.role,
        is_global: false,
        global_role: null,
        created_at: pc.created_at,
        updated_at: pc.updated_at,
      });
    });

    // Add global collaborators (if not overridden by project-specific)
    globalCollaborators.forEach((gc: GlobalCollaboratorRecord) => {
      const projectCollab = projectCollabMap.get(gc.collaborator_email);
      if (!projectCollab) {
        // Add as global collaborator (only if not already in project-specific)
        mergedCollaborators.push({
          id: gc.id,
          project_id: null,
          owner_id: userId,
          collaborator_email: gc.collaborator_email,
          collaborator_name: userNameMap.get(gc.collaborator_email) ?? null,
          role: gc.role,
          is_global: true,
          global_role: gc.role,
          created_at: gc.created_at,
          updated_at: gc.updated_at,
        });
      }
    });

    // Sort by created_at descending
    mergedCollaborators.sort((a, b) => {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return res.status(200).json({
      success: true,
      data: camelcaseKeys(mergedCollaborators, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching all project collaborators');
  }
};

// Add a collaborator to a specific project
export const addProjectCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const projectId = req.params.projectId;
    const { collaborator_email, role } = pickSnakeBody<ProjectCollaboratorSnakeBody>(req, [
      ...PROJECT_COLLAB_FIELDS,
    ]);
    const resolvedRole = role ?? 'viewer';

    if (!projectId || !collaborator_email) {
      throw new AppError('Project ID and collaborator email are required', {
        statusCode: 400,
        code: 'COLLABORATOR_INPUT_REQUIRED',
      });
    }

    // Verify user owns the project (supports client_id)
    const { data: project, error: projectError } = await resolveProjectByIdOrClientId(
      projectId,
      userId
    );

    if (projectError || !project || project.user_id !== userId) {
      throw new AppError('Project not found or you do not have permission', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const actualProjectId = project.id;

    // Check if collaborator already exists
    const { data: existingCollaborator } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('id')
      .eq('project_id', actualProjectId)
      .eq('collaborator_email', collaborator_email)
      .single();

    if (existingCollaborator) {
      throw new AppError('Collaborator already exists for this project', {
        statusCode: 409,
        code: 'COLLABORATOR_ALREADY_EXISTS',
      });
    }

    // Add the collaborator
    const { data: collaborator } = await supabaseAdmin
      .from('ProjectCollaborators')
      .insert([
        {
          project_id: actualProjectId,
          owner_id: userId,
          collaborator_email,
          role: resolvedRole,
        },
      ])
      .select()
      .single();

    if (!collaborator) {
      console.error('Error adding project collaborator:');
      throw new AppError('Failed to add collaborator', {
        statusCode: 500,
        code: 'PROJECT_COLLAB_ADD_FAILED',
        exposeError: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Collaborator added successfully',
      data: camelcaseKeys(collaborator, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error adding project collaborator');
  }
};

// Update a collaborator on a specific project
export const updateProjectCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { projectId, collaboratorId } = req.params;
    const { role } = pickSnakeBody<ProjectCollaboratorSnakeBody>(req, ['role']);

    if (!projectId || !collaboratorId || !role) {
      throw new AppError('Project ID, collaborator ID, and role are required', {
        statusCode: 400,
        code: 'COLLABORATOR_INPUT_REQUIRED',
      });
    }

    const { data: project, error: projectError } = await resolveProjectByIdOrClientId(
      projectId,
      userId
    );

    if (projectError || !project || project.user_id !== userId) {
      throw new AppError('Project not found or you do not have permission', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const actualProjectId = project.id;

    const { data: collaborator, error } = await supabaseAdmin
      .from('ProjectCollaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .eq('project_id', actualProjectId)
      .select()
      .single();

    if (error) {
      console.error('Error updating project collaborator:', error);
      throw new AppError('Failed to update collaborator', {
        statusCode: 500,
        code: 'PROJECT_COLLAB_UPDATE_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Collaborator updated successfully',
      data: camelcaseKeys(collaborator, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error updating project collaborator');
  }
};

// Remove a collaborator from a specific project
export const removeProjectCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { projectId, collaboratorId } = req.params;

    if (!projectId || !collaboratorId) {
      throw new AppError('Project ID and collaborator ID are required', {
        statusCode: 400,
        code: 'COLLABORATOR_INPUT_REQUIRED',
      });
    }

    const { data: project, error: projectError } = await resolveProjectByIdOrClientId(
      projectId,
      userId
    );

    if (projectError || !project || project.user_id !== userId) {
      throw new AppError('Project not found or you do not have permission', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const actualProjectId = project.id;

    // Capture the removed user's ID and the shared client_id for post-removal cleanup
    const { data: collaborator } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('collaborator_user_id')
      .eq('id', collaboratorId)
      .eq('project_id', actualProjectId)
      .maybeSingle();

    const removedUserId = collaborator?.collaborator_user_id;

    const { error } = await supabaseAdmin
      .from('ProjectCollaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('project_id', actualProjectId);

    if (error) {
      console.error('Error removing project collaborator:', error);
      throw new AppError('Failed to remove collaborator', {
        statusCode: 500,
        code: 'PROJECT_COLLAB_REMOVE_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    // Move any photos the collaborator uploaded to this project under the owner,
    // then delete the collaborator's local Projects row.
    if (removedUserId && project.client_id) {
      const now = new Date().toISOString();
      await supabaseAdmin
        .from('Photos')
        .update({ user_id: project.user_id, updated_by: 'web', updated_at: now })
        .eq('project_id', project.client_id)
        .eq('user_id', removedUserId);

      await supabaseAdmin
        .from('Projects')
        .delete()
        .eq('client_id', project.client_id)
        .eq('user_id', removedUserId)
        .neq('id', actualProjectId);
    }

    return res.status(200).json({
      success: true,
      message: 'Collaborator removed successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error removing project collaborator');
  }
};

// Add a global collaborator
export const addGlobalCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { collaborator_email, role } = pickSnakeBody<GlobalCollaboratorSnakeBody>(req, [
      ...GLOBAL_COLLAB_FIELDS,
    ]);
    const resolvedRole = role ?? 'viewer';

    if (!collaborator_email) {
      throw new AppError('Collaborator email is required', {
        statusCode: 400,
        code: 'COLLABORATOR_EMAIL_REQUIRED',
      });
    }

    // Check if collaborator already exists
    const { data: existingCollaborator } = await supabaseAdmin
      .from('GlobalCollaborators')
      .select('id')
      .eq('owner_id', userId)
      .eq('collaborator_email', collaborator_email)
      .single();

    if (existingCollaborator) {
      throw new AppError('Global collaborator already exists', {
        statusCode: 409,
        code: 'GLOBAL_COLLABORATOR_EXISTS',
      });
    }

    // Add the global collaborator
    const { data: collaborator, error } = await supabaseAdmin
      .from('GlobalCollaborators')
      .insert([
        {
          owner_id: userId,
          collaborator_email,
          role: resolvedRole,
        },
      ])
      .select()
      .single();

    if (error || !collaborator) {
      console.error('Error adding global collaborator:', error);
      throw new AppError('Failed to add global collaborator', {
        statusCode: 500,
        code: 'GLOBAL_COLLAB_ADD_FAILED',
        detail: error?.message,
        exposeError: true,
      });
    }

    return res.status(201).json({
      success: true,
      message: 'Global collaborator added successfully',
      data: camelcaseKeys(collaborator, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error adding global collaborator');
  }
};

// Update a global collaborator's role
export const updateGlobalCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { collaboratorId } = req.params;
    const { role } = pickSnakeBody<GlobalCollaboratorSnakeBody>(req, ['role']);

    if (!collaboratorId || !role) {
      throw new AppError('Collaborator ID and role are required', {
        statusCode: 400,
        code: 'COLLABORATOR_INPUT_REQUIRED',
      });
    }

    // Update the global collaborator
    const { data: collaborator, error } = await supabaseAdmin
      .from('GlobalCollaborators')
      .update({ role })
      .eq('id', collaboratorId)
      .eq('owner_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating global collaborator:', error);
      throw new AppError('Failed to update global collaborator', {
        statusCode: 500,
        code: 'GLOBAL_COLLAB_UPDATE_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Global collaborator updated successfully',
      data: camelcaseKeys(collaborator, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error updating global collaborator');
  }
};

// Remove a global collaborator
export const removeGlobalCollaborator = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const { collaboratorId } = req.params;

    if (!collaboratorId) {
      throw new AppError('Collaborator ID is required', {
        statusCode: 400,
        code: 'COLLABORATOR_ID_REQUIRED',
      });
    }

    // Remove the global collaborator
    const { error } = await supabaseAdmin
      .from('GlobalCollaborators')
      .delete()
      .eq('id', collaboratorId)
      .eq('owner_id', userId);

    if (error) {
      console.error('Error removing global collaborator:', error);
      throw new AppError('Failed to remove global collaborator', {
        statusCode: 500,
        code: 'GLOBAL_COLLAB_REMOVE_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Global collaborator removed successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error removing global collaborator');
  }
};

// Get collaborator info for the authenticated user
export const getCollaboratorInfo = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    // Check if user is a project-specific collaborator
    const { data: projectCollaborators } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('project_id')
      .eq('collaborator_user_id', userId);

    const isCollaborator = Boolean(projectCollaborators && projectCollaborators.length > 0);
    const collaboratingProjectIds: string[] = (projectCollaborators || []).map(
      (pc) => pc.project_id
    );

    return res.status(200).json({
      success: true,
      data: {
        isCollaborator,
        collaboratingProjectIds,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching collaborator info');
  }
};

// ==================== Helper Functions ====================

// Check if a user has access to a project (either as owner, project collaborator, or global collaborator)
// Project-specific permissions override global permissions
export const checkProjectAccess = async (
  projectId: string,
  userEmail: string
): Promise<{ hasAccess: boolean; role?: string; isOwner: boolean }> => {
  try {
    const { data: project } = await resolveProjectByIdOrClientId(projectId);
    if (!project) return { hasAccess: false, isOwner: false };

    const { data: profile } = await supabaseAdmin
      .from('Profiles')
      .select('id, email')
      .eq('email', userEmail)
      .maybeSingle();

    if (profile && project.user_id === profile.id) {
      return { hasAccess: true, role: 'owner', isOwner: true };
    }

    if (profile) {
      const { data: projectCollaborator } = await supabaseAdmin
        .from('ProjectCollaborators')
        .select('role')
        .eq('project_id', project.id)
        .eq('collaborator_user_id', profile.id)
        .maybeSingle();

      if (projectCollaborator) {
        return { hasAccess: true, role: projectCollaborator.role, isOwner: false };
      }
    }

    return { hasAccess: false, isOwner: false };
  } catch (error) {
    console.error('Error checking project access:', error);
    return { hasAccess: false, isOwner: false };
  }
};

// Build a map from collaborator email or user ID to display name using Profiles table and Auth
const buildUserInfoMap = async (
  emails: string[],
  userIds: string[] = []
): Promise<Map<string, { name: string | null; email: string | null }>> => {
  const uniqueEmails = Array.from(new Set(emails)).filter(Boolean);
  const uniqueUserIds = Array.from(new Set(userIds)).filter(Boolean);
  const userInfoMap = new Map<string, { name: string | null; email: string | null }>();

  if (uniqueUserIds.length > 0) {
    const { data: profilesById } = await supabaseAdmin
      .from('Profiles')
      .select('id, name, email')
      .in('id', uniqueUserIds);

    (profilesById || []).forEach(
      (p: { id: string; name?: string | null; email?: string | null }) => {
        const info = { name: p.name ?? null, email: p.email ?? null };
        if (p.id) userInfoMap.set(p.id, info);
        if (p.email) userInfoMap.set(p.email, info);
      }
    );
  }

  if (uniqueEmails.length > 0) {
    const { data: profilesByEmail } = await supabaseAdmin
      .from('Profiles')
      .select('id, name, email')
      .in('email', uniqueEmails);

    (profilesByEmail || []).forEach(
      (p: { id: string; name?: string | null; email?: string | null }) => {
        const info = { name: p.name ?? null, email: p.email ?? null };
        if (p.id) userInfoMap.set(p.id, info);
        if (p.email) userInfoMap.set(p.email, info);
      }
    );
  }

  // Fallback to Supabase Auth for missing user IDs (e.g. accepted invite users without a Profiles row)
  const foundUserIds = new Set(userInfoMap.keys());
  const missingUserIds = uniqueUserIds.filter((id) => !foundUserIds.has(id));
  if (missingUserIds.length > 0) {
    const authResults = await Promise.allSettled(
      missingUserIds.map(async (id) => {
        try {
          const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
          if (error || !data?.user) return null;
          const email = data.user.email;
          const name =
            (data.user.user_metadata?.name as string | undefined) ||
            (data.user.user_metadata?.full_name as string | undefined) ||
            null;
          return { id, email, name };
        } catch {
          return null;
        }
      })
    );
    authResults.forEach((result) => {
      if (result.status !== 'fulfilled' || !result.value) return;
      const { id, email, name } = result.value;
      const info = { name, email: email ?? null };
      if (id) userInfoMap.set(id, info);
      if (email) userInfoMap.set(email, info);
    });
  }

  return userInfoMap;
};

// Convenience wrapper returning display names only
const buildUserNameMap = async (
  emails: string[],
  userIds: string[] = []
): Promise<Map<string, string>> => {
  const userInfoMap = await buildUserInfoMap(emails, userIds);
  const userNameMap = new Map<string, string>();
  userInfoMap.forEach((info, key) => {
    const displayName = info.name || info.email || key;
    userNameMap.set(key, displayName);
  });
  return userNameMap;
};

// Build a map from collaborator email to display name using Supabase Auth (backward compatibility)
const buildUserNameMapByEmails = async (emails: string[]): Promise<Map<string, string | null>> => {
  const userInfoMap = await buildUserInfoMap(emails);
  const resultMap = new Map<string, string | null>();
  emails.forEach((email) => {
    const info = userInfoMap.get(email);
    resultMap.set(email, info?.name || info?.email || email || null);
  });
  return resultMap;
};
