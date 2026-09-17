import type { AuthSource } from './auth.types';

import { isPWA } from '@/utils/auth';

const LEGACY_AUTH_SOURCE_KEY = 'auth_source';

const getAuthSourceKey = (): string => {
  return isPWA() ? 'pwa_auth_source' : 'web_auth_source';
};

export const setAuthSource = (source: AuthSource) => {
  localStorage.setItem(getAuthSourceKey(), source);
  localStorage.removeItem(LEGACY_AUTH_SOURCE_KEY);
};

export const getAuthSource = (): AuthSource | null => {
  const currentKey = getAuthSourceKey();
  const source = localStorage.getItem(currentKey) ?? localStorage.getItem(LEGACY_AUTH_SOURCE_KEY);

  if (source === 'backend' || source === 'supabase') {
    if (!localStorage.getItem(currentKey)) {
      localStorage.setItem(currentKey, source);
    }

    return source;
  }

  return null;
};

export const clearAuthSource = () => {
  localStorage.removeItem(getAuthSourceKey());
  localStorage.removeItem(LEGACY_AUTH_SOURCE_KEY);
};
