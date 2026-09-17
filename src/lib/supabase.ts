import { createClient } from '@supabase/supabase-js';

import { logError } from '@/utils/logger';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logError(
    'Missing Supabase environment variables:',
    {
      supabaseUrl: !!supabaseUrl,
      supabaseAnonKey: !!supabaseAnonKey,
      envKeys: Object.keys(import.meta.env).filter((k) => k.includes('SUPABASE')),
    },
    'Supabase'
  );
  throw new Error('supabaseUrl is required');
}

const browserStorage = typeof window !== 'undefined' ? window.localStorage : undefined;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    flowType: 'pkce',
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storage: browserStorage,
  },
});
