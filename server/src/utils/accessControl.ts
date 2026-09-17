// utils/accessControl.ts
import { supabaseAdmin } from '@/lib/supabase';
import { AppError } from '@/utils/controllerError';

type ProjectRecord = {
  id: string;
  user_id: string;
  [key: string]: unknown;
};

type UserRecord = {
  email: string | null;
};

type CollaboratorRecord = {
  id: string;
};

type AssertProjectAccessResult = {
  project: ProjectRecord;
  userEmail: string | null;
};

export async function assertOwnedRecord<T>(
  table: string,
  id: string,
  userId: string,
  options?: {
    select?: string; // 預設 'id'
    notFoundCode?: string; // e.g. 'PLANNING_TASK_NOT_FOUND'
    notFoundMessage?: string; // e.g. 'Planning task not found or you do not have permission'
  }
): Promise<T> {
  const {
    select = 'id',
    notFoundCode = 'RESOURCE_NOT_FOUND',
    notFoundMessage = 'Resource not found',
  } = options ?? {};

  const { data, error } = await supabaseAdmin
    .from(table)
    .select(select)
    .eq('id', id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    console.error(`Error asserting ownership on ${table}:`, error);
    throw new AppError(notFoundMessage, {
      statusCode: 404,
      code: notFoundCode,
      detail: error?.message,
      exposeError: true,
    });
  }

  return data as T;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 專案存取權限 (V1: Owner 或 Member，不依賴 Email)
export async function assertProjectAccess(
  projectId: string,
  userId: string
): Promise<AssertProjectAccessResult> {
  let project: ProjectRecord | null = null;
  const isUuid = UUID_REGEX.test(projectId);

  // 1. 先用 server UUID `id` 查
  if (isUuid) {
    const { data: byId } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('id', projectId)
      .maybeSingle<ProjectRecord>();

    if (byId) {
      project = byId;
    }
  }

  // 2. 若沒找到，嘗試用 client_id + userId（當前用戶的專案）
  if (!project && userId) {
    const { data: byClientAndUser } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('client_id', projectId)
      .eq('user_id', userId)
      .maybeSingle<ProjectRecord>();

    if (byClientAndUser) {
      project = byClientAndUser;
    }
  }

  // 3. 若還是沒找到，嘗試用 client_id 查詢協作者所屬的專案
  if (!project && userId) {
    const { data: userCollabs } = await supabaseAdmin
      .from('ProjectCollaborators')
      .select('project_id')
      .eq('collaborator_user_id', userId);

    if (userCollabs && userCollabs.length > 0) {
      const collabProjectIds = userCollabs.map((c) => c.project_id);
      const { data: byCollabProject } = await supabaseAdmin
        .from('Projects')
        .select('*')
        .eq('client_id', projectId)
        .in('id', collabProjectIds)
        .maybeSingle<ProjectRecord>();

      if (byCollabProject) {
        project = byCollabProject;
      }
    }
  }

  // 4. 最後 fallback: 直接用 client_id 查一筆
  if (!project) {
    const { data: byClientList } = await supabaseAdmin
      .from('Projects')
      .select('*')
      .eq('client_id', projectId)
      .limit(1);

    if (byClientList && byClientList.length > 0) {
      project = byClientList[0] as ProjectRecord;
    }
  }

  if (!project) {
    throw new AppError('Project not found', {
      statusCode: 404,
      code: 'PROJECT_NOT_FOUND',
      exposeError: true,
    });
  }

  // 2. 判斷是否有權限（Owner 或 Member）
  const isOwner = project.user_id === userId;

  const { data: projectMember } = await supabaseAdmin
    .from('ProjectCollaborators')
    .select('id')
    .eq('project_id', project.id)
    .eq('collaborator_user_id', userId)
    .maybeSingle<CollaboratorRecord>();

  const hasAccess = Boolean(isOwner || projectMember);

  if (!hasAccess) {
    throw new AppError('You do not have permission to access this project', {
      statusCode: 403,
      code: 'PROJECT_ACCESS_FORBIDDEN',
    });
  }

  // Fetch user email for backward compatibility
  const { data: user } = await supabaseAdmin
    .from('Profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle<UserRecord>();

  const userEmail = user?.email ?? null;

  return { project, userEmail };
}
