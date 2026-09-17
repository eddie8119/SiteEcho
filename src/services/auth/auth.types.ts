import type { Session } from '@supabase/supabase-js';

export type AuthSource = 'backend' | 'supabase';
export type AuthRole = 'admin' | 'user';

export interface AuthSessionPayload {
  accessToken: string;
  refreshToken?: string | null;
  role?: AuthRole;
  source: AuthSource;
}

export interface LogoutOptions {
  allDevices?: boolean;
  revokeRemote?: boolean;
}

export interface OAuthExchangeResult {
  session: Session;
}
