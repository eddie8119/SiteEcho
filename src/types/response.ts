import type { CollaboratorRole } from './collaborator';
export type { CollaboratorRole } from './collaborator';
import type { InvitationStatus, InvitationType } from './invitation';
import type { ConstructionSelection, ProjectType } from './selection';
import type { TaskStatus } from './task';

// 平面圖項目
export interface FloorPlanItem {
  key: string;
  data: string; // base64 編碼的圖片資料
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  };
  access_token: string;
  refresh_token: string;
}

export interface DraftResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  tasks: {
    id: string;
    content: string;
    completed: boolean;
    isMoved?: boolean;
  }[];
}

export interface ProjectResponse {
  id: string;
  clientId?: string;
  name: string;
  userId: string;
  ownerName?: string;
  ownerEmail?: string;
  groupReportNotes?: Record<string, unknown> | null;
  lastUsedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  constructionContainer?: ConstructionSelection[] | null;
  type?: ProjectType;
  isShared?: boolean;
}

// 任務
export interface TaskResponse {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastReminderSentAt: Date | null;
  lineReminderSent: boolean;
  emailReminderSent: boolean;
  status: TaskStatus;
  reminderDateTime?: string;
  endDateTime?: string;
  title: string;
  description: string;
  constructionType: string;
  projectId: string;
}

// 專案協作者
export interface ProjectCollaboratorResponse {
  id: string;
  projectId: string;
  userId: string;
  collaboratorName?: string;
  collaboratorEmail: string;
  role: CollaboratorRole;
  isGlobal: boolean; // 是否為全域協作者
  globalRole: CollaboratorRole | null; // 全域角色（如果是全域協作者）
  createdAt: Date;
  updatedAt: Date;
}

// 全域協作者
export interface GlobalCollaboratorResponse {
  id: string;
  ownerId: string;
  collaboratorEmail: string;
  role: CollaboratorRole;
  createdAt: Date;
  updatedAt: Date;
}

// 協作者邀請
export interface CollaboratorInvitationResponse {
  id: string;
  invitationType: InvitationType;
  projectId: string | null;
  inviterId: string;
  inviteeEmail: string;
  role: CollaboratorRole;
  status: InvitationStatus;
  invitationToken: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt: Date | null;
  // 關聯數據
  projects?: {
    title: string;
  };
  inviterName?: string;
}
