// Local type definitions
type Language = 'en' | 'zh-TW' | 'zh-CN' | 'ja' | 'ko' | string;

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

// auth
export type RefreshRequestBody = {
  refresh_token?: string;
};

export type SSOCallbackBody = {
  access_token?: string;
  refresh_token?: string | null;
};

// project
export type ProjectSnakeBody = {
  name: string;
  group_report_notes?: JsonValue | null;
  last_used_at?: string | null;
};

export type ProjectPatchSnakeBody = Partial<ProjectSnakeBody>;

// user settings
export type UserSettingsSnakeBody = {
  line_notify_token?: string | null;
  email_notifications_enabled?: boolean | null;
  line_notifications_enabled?: boolean | null;
};

// user
export type RegisterSnakeBody = {
  email: string;
  password: string;
};

export type ProfileUpdateSnakeBody = {
  name?: string | null;
  phone_number?: string | null;
  company?: string | null;
};

// collaborators
export type CollaboratorRole = 'owner' | 'manager' | 'viewer';

export type ProjectCollaboratorSnakeBody = {
  collaborator_email?: string;
  role?: CollaboratorRole | null;
  locale?: Language | null;
};

export type GlobalCollaboratorSnakeBody = {
  collaborator_email?: string;
  role?: CollaboratorRole | null;
  locale?: Language | null;
};

// common
export type CommonSnakeBody = {
  construction?: JsonValue | null;
  unit?: string | null;
  project_type?: string | null;
};

// drafts
export type DraftSnakeBody = {
  tasks?: JsonValue;
};
