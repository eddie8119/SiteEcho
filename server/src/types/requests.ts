import { Request } from 'express';
import { SupabaseClient } from '@supabase/supabase-js';

export type AuthenticatedRequest = Request & {
  userId: string;
  supabase?: SupabaseClient;
};
