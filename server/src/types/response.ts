import type { CollaboratorRole as DatabaseCollaboratorRole } from './requestBody';

// 協作者角色 (reuse database definition)
export type CollaboratorRole = DatabaseCollaboratorRole;

// 邀請類型
export type InvitationType = 'project' | 'global';

// 邀請狀態
export type InvitationStatus = 'pending' | 'accepted' | 'rejected';
