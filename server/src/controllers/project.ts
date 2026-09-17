import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';
import snakecaseKeys from 'snakecase-keys';

import { PROJECT_MUTABLE_COLUMNS } from '@/constants/mutableColumns';
import { supabaseAdmin } from '@/lib/supabase';
import { ProjectPatchSnakeBody, ProjectSnakeBody } from '@/types/requestBody';
import { AuthenticatedRequest } from '@/types/requests';
import { pickSnakeBody } from '@/utils/bodyTransform';
import { AppError, handleControllerError } from '@/utils/controllerError';
import { sanitizeAndCamelcase, mapSanitizeCamelcase } from '@/utils/formatters';

// Local type definitions
interface ProjectResponse {
  id: string;
  name: string;
  // Add other fields as needed
}

/**
 * Get all projects for overview page.
 * Returns projects with owner name.
 */
export const getOverviewProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    const { data: profile } = await supabaseAdmin
      .from('Profiles')
      .select('name')
      .eq('id', userId)
      .single();

    const ownerName = profile?.name;

    // 查詢當前用戶自己擁有的專案
    const { data: ownedProjects, error: ownedError } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned projects:', ownedError);
      throw new AppError('Failed to fetch projects', {
        statusCode: 500,
        code: 'PROJECTS_FETCH_FAILED',
        detail: ownedError.message,
        exposeError: true,
      });
    }

    // 查詢當前用戶作為協作者參與的專案
    let collabProjects: unknown[] = [];
    try {
      const { data: collaborations } = await supabaseAdmin
        .from('ProjectCollaborators')
        .select('project_id')
        .eq('collaborator_user_id', userId);

      const collabProjectIds =
        collaborations?.map((c) => (c as { project_id: string }).project_id) || [];
      if (collabProjectIds.length > 0) {
        const { data: fetchedCollabProjects } = await supabaseAdmin
          .from('Projects')
          .select('*')
          .in('id', collabProjectIds)
          .order('created_at', { ascending: false });

        collabProjects = fetchedCollabProjects || [];
      }
    } catch {
      // 容錯：若協作者表查詢異常則不中斷主流程
    }

    // 合併專案（去重）
    const projectMap = new Map<string, Record<string, unknown>>();
    for (const project of ownedProjects || []) {
      projectMap.set(project.id, { ...project, isOwner: true, ownerName } as Record<
        string,
        unknown
      >);
    }
    for (const project of collabProjects) {
      const typedProject = project as Record<string, string>;
      const projectId = typedProject.id;
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, { ...typedProject, isOwner: false } as Record<string, unknown>);
      }
    }

    const mergedProjects = Array.from(projectMap.values());

    // 在返回前處理數據，移除敏感欄位
    const safeProjects = mergedProjects.map((project) => {
      const sanitizedProject = sanitizeAndCamelcase(project) as ProjectResponse;

      const typed = project as Record<string, unknown>;
      return {
        ...sanitizedProject,
        ownerName: (typed.ownerName as string | undefined) ?? ownerName,
        isOwner: (typed.isOwner as boolean | undefined) ?? typed.user_id === userId,
      };
    });

    // 轉換為駝峰式命名並返回
    return res.status(200).json({
      success: true,
      data: camelcaseKeys(safeProjects, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching projects');
  }
};

/**
 * Sync local projects to Supabase.
 * Upserts projects based on client_id (unique on user_id + client_id).
 */
export const syncProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { projects } = req.body as {
      projects?: Array<{
        clientId: string;
        name: string;
        createdAt: string;
        lastUsedAt: string;
        updatedAt: string;
        groupReportNotes?: Record<string, unknown> | null;
      }>;
    };

    // Convert camelCase to snake_case for database
    const snakeProjects = projects ? snakecaseKeys({ projects }, { deep: true }).projects : [];

    if (!Array.isArray(snakeProjects) || snakeProjects.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          total: 0,
          synced: 0,
          failed: 0,
          results: [],
        },
      });
    }

    const results = [];
    for (const project of snakeProjects) {
      try {
        const { data: upserted, error: upsertError } = await reqSupabase
          .from('Projects')
          .upsert(
            [
              {
                client_id: project.client_id,
                user_id: userId,
                name: project.name,
                created_at: project.created_at,
                last_used_at: project.last_used_at,
                updated_at: project.updated_at,
                group_report_notes: project.group_report_notes,
              },
            ],
            { onConflict: 'user_id, client_id' }
          )
          .select('id')
          .single();

        if (upsertError) {
          results.push({
            client_id: project.client_id,
            success: false,
            error: upsertError.message,
          });
          continue;
        }

        results.push({ client_id: project.client_id, success: true, id: upserted.id });
      } catch (err) {
        results.push({
          client_id: project.client_id,
          success: false,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return res.status(200).json({
      success: true,
      data: {
        total: snakeProjects.length,
        synced: successCount,
        failed: snakeProjects.length - successCount,
        results,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Project sync error');
  }
};

/**
 * Batch delete projects by client_ids.
 * Deletes projects and associated planning materials.
 */
export const deleteProjectsBatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { client_ids } = req.body as { client_ids?: string[] };

    if (!Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(200).json({ success: true, message: 'No projects to delete' });
    }

    // First, get the server IDs for the client_ids
    const { data: projectsToDelete, error: fetchError } = await reqSupabase
      .from('Projects')
      .select('id')
      .eq('user_id', userId)
      .in('client_id', client_ids);

    if (fetchError) {
      throw new AppError('Failed to fetch projects to delete', {
        statusCode: 500,
        code: 'PROJECTS_FETCH_FAILED',
        detail: fetchError.message,
      });
    }

    if (!projectsToDelete || projectsToDelete.length === 0) {
      return res.status(200).json({ success: true, message: 'No projects found to delete' });
    }

    const projectIds = projectsToDelete.map((p) => p.id);

    // Set project_id to NULL for all photos associated with these projects
    const { error: photosUpdateError } = await reqSupabase
      .from('Photos')
      .update({ project_id: null })
      .eq('user_id', userId)
      .in('project_id', projectIds);

    if (photosUpdateError) {
      console.error('Error updating photos project_id:', photosUpdateError);
      // Continue with deletion even if photos update fails
    }

    // Now delete the projects
    const { error: deleteError } = await reqSupabase
      .from('Projects')
      .delete()
      .eq('user_id', userId)
      .in('client_id', client_ids);

    if (deleteError) {
      throw new AppError('Failed to delete projects from DB', {
        statusCode: 500,
        code: 'PROJECTS_DELETE_FAILED',
        detail: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${client_ids.length} projects`,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Project delete batch error');
  }
};

/**
 * Get all projects for the current user.
 */
export const getProjects = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;

    // 查詢當前用戶自己擁有的專案
    const { data: ownedProjects, error: ownedError } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (ownedError) {
      console.error('Error fetching owned projects:', ownedError);
      throw new AppError('Failed to fetch projects', {
        statusCode: 500,
        code: 'PROJECTS_FETCH_FAILED',
        detail: ownedError.message,
        exposeError: true,
      });
    }

    // 查詢當前用戶作為協作者參與的專案
    let collabProjects: unknown[] = [];
    try {
      const { data: collaborations } = await supabaseAdmin
        .from('ProjectCollaborators')
        .select('project_id')
        .eq('collaborator_user_id', userId);

      const collabProjectIds =
        collaborations?.map((c) => (c as { project_id: string }).project_id) || [];
      if (collabProjectIds.length > 0) {
        const { data: fetchedCollabProjects } = await supabaseAdmin
          .from('Projects')
          .select('*')
          .in('id', collabProjectIds)
          .order('created_at', { ascending: false });

        collabProjects = fetchedCollabProjects || [];
      }
    } catch {
      // 容錯：若協作者表查詢異常則不中斷主流程
    }

    // 收集所有專案擁有者 ID，從 Supabase Auth 取得名稱
    const allProjectUserIds = [
      ...(ownedProjects || []).map((p) => p.user_id),
      ...(collabProjects || []).map((p) => (p as Record<string, string>).user_id),
    ];
    const uniqueOwnerIds = Array.from(new Set(allProjectUserIds)).filter(Boolean);

    const ownerInfoMap = new Map<string, { name: string | null; email: string | null }>();
    if (uniqueOwnerIds.length > 0) {
      const authResults = await Promise.allSettled(
        uniqueOwnerIds.map(async (id) => {
          try {
            const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
            if (error || !data?.user) return null;
            const user = data.user;
            const name =
              (user.user_metadata?.name as string | undefined) ||
              (user.user_metadata?.full_name as string | undefined) ||
              user.email ||
              null;
            return { id, name, email: user.email ?? null };
          } catch {
            return null;
          }
        })
      );
      authResults.forEach((result) => {
        if (result.status !== 'fulfilled' || !result.value) return;
        const { id, name, email } = result.value;
        ownerInfoMap.set(id, { name, email });
      });
    }

    // 合併專案（去重）
    const projectMap = new Map<string, Record<string, unknown>>();
    for (const project of ownedProjects || []) {
      const isOwner = project.user_id === userId;
      const ownerInfo = ownerInfoMap.get(project.user_id);
      projectMap.set(project.id, {
        ...project,
        isOwner,
        isShared: !isOwner,
        ownerName: ownerInfo?.name ?? null,
      } as Record<string, unknown>);
    }
    for (const project of collabProjects) {
      const typedProject = project as Record<string, string>;
      const projectId = typedProject.id;
      if (!projectMap.has(projectId)) {
        const ownerInfo = ownerInfoMap.get(typedProject.user_id);
        projectMap.set(projectId, {
          ...typedProject,
          isOwner: false,
          isShared: true,
          ownerName: ownerInfo?.name ?? null,
        } as Record<string, unknown>);
      }
    }

    const mergedProjects = Array.from(projectMap.values());

    const safeProjects = (mapSanitizeCamelcase(mergedProjects, []) as ProjectResponse[]).map(
      (project) => ({
        ...project,
        ownerName: (project as unknown as Record<string, unknown>).ownerName as string | undefined,
        isShared: (project as unknown as Record<string, unknown>).isShared as boolean | undefined,
        isOwner:
          ((project as unknown as Record<string, unknown>).isOwner as boolean | undefined) ??
          (project as unknown as Record<string, unknown>).userId === userId,
      })
    );

    return res.status(200).json({
      success: true,
      data: safeProjects,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching projects');
  }
};

/**
 * Get a single project by ID.
 */
export const getProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;

    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'PROJECT_ID_REQUIRED',
      });
    }

    // 查詢專案資訊
    const { data: project, error: projectError } = await reqSupabase
      .from('Projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (projectError || !project) {
      console.error('Error fetching project:', projectError);
      throw new AppError('Project not found', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError?.message,
        exposeError: true,
      });
    }

    const safeProject = sanitizeAndCamelcase(project, []) as ProjectResponse;

    return res.status(200).json({
      success: true,
      data: safeProject,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error fetching project');
  }
};

/**
 * Create a new project.
 */
export const createProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;

    const { name, group_report_notes, last_used_at } = pickSnakeBody<ProjectSnakeBody>(req, [
      ...PROJECT_MUTABLE_COLUMNS,
    ]);

    // 驗證必要欄位
    if (!name) {
      throw new AppError('Missing required fields', {
        statusCode: 400,
        code: 'PROJECT_REQUIRED_FIELDS_MISSING',
      });
    }

    // 創建新專案
    const { data: project, error } = await reqSupabase
      .from('Projects')
      .insert([
        {
          name,
          group_report_notes,
          last_used_at,
          user_id: userId,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      throw new AppError('Failed to create project', {
        statusCode: 500,
        code: 'PROJECT_CREATE_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    const safeProject = sanitizeAndCamelcase(project, []) as ProjectResponse;

    return res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: safeProject,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error creating project');
  }
};

/**
 * Update an existing project.
 */
export const updateProject = async (req: Request, res: Response) => {
  try {
    const projectId = req.params.id;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;

    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'PROJECT_ID_REQUIRED',
      });
    }

    const { name, last_used_at } = pickSnakeBody<ProjectPatchSnakeBody>(req, [
      ...PROJECT_MUTABLE_COLUMNS,
    ]);

    // Handle group_report_notes separately to avoid snake_case mangling Chinese keys
    const camelBody = req.body as { groupReportNotes?: Record<string, unknown> };
    const group_report_notes = camelBody.groupReportNotes || null;

    // 更新專案
    const { data: updatedProject, error: updateError } = await reqSupabase
      .from('Projects')
      .update({
        name,
        group_report_notes,
        last_used_at,
        updated_at: new Date().toISOString(),
      })
      .eq('id', projectId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating project:', updateError);
      throw new AppError('Failed to update project', {
        statusCode: 500,
        code: 'PROJECT_UPDATE_FAILED',
        detail: updateError.message,
        exposeError: true,
      });
    }

    const safeProject = sanitizeAndCamelcase(updatedProject) as ProjectResponse;

    return res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: safeProject,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error updating project');
  }
};

/**
 * Delete a project by ID.
 */
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    const projectId = req.params.id;

    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'PROJECT_ID_REQUIRED',
      });
    }

    // 首先檢查專案是否存在並屬於當前用戶
    const { error: projectError } = await reqSupabase
      .from('Projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single();

    if (projectError) {
      console.error('Error fetching project:', projectError);
      throw new AppError('Project not found or you do not have permission to delete it', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
        detail: projectError.message,
        exposeError: true,
      });
    }

    try {
      // 刪除專案本身
      const { error: projectDeleteError } = await reqSupabase
        .from('Projects')
        .delete()
        .eq('id', projectId)
        .eq('user_id', userId);

      if (projectDeleteError) {
        console.error('Error deleting project:', projectDeleteError);
        throw new AppError('Failed to delete project', {
          statusCode: 500,
          code: 'PROJECT_DELETE_FAILED',
          detail: projectDeleteError.message,
          exposeError: true,
        });
      }
    } catch (innerError: unknown) {
      return handleControllerError(res, innerError, 'Transaction error while deleting project');
    }

    return res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Unexpected error deleting project');
  }
};
