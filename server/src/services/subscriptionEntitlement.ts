import { supabaseAdmin } from '@/lib/supabase';

export type EntitlementProvider = 'apple' | 'google' | 'web' | 'manual';

export interface EntitlementState {
  userId: string;
  isPro: boolean;
  activeProviders: EntitlementProvider[];
  proExpiryTime: Date | null;
}

export interface ProviderSubscriptionStatus {
  provider: EntitlementProvider;
  isActive: boolean;
  expiresAt: Date | null;
}

/**
 * Resolve the user's Pro entitlement from all provider sources.
 * Apple / Google / Web / manual 任一來源仍有效 → 保持 Pro
 * 所有來源皆失效 → 回到 Free
 */
export const resolveEntitlement = async (
  userId: string,
  overrides?: Partial<Record<EntitlementProvider, ProviderSubscriptionStatus>>
): Promise<EntitlementState> => {
  const now = new Date();

  const sources: ProviderSubscriptionStatus[] = [];

  // 1. Apple (from AppleTransactionEvents)
  const { data: appleEvents } = await supabaseAdmin
    .from('AppleTransactionEvents')
    .select('expires_date')
    .eq('user_id', userId)
    .order('expires_date', { ascending: false })
    .limit(1);

  const appleExpiry =
    appleEvents && appleEvents.length > 0 ? new Date(appleEvents[0].expires_date) : null;
  sources.push({
    provider: 'apple',
    isActive: !!appleExpiry && appleExpiry > now,
    expiresAt: appleExpiry,
  });

  // 2. Google (from GooglePurchaseEvents)
  const { data: googleEvents } = await supabaseAdmin
    .from('GooglePurchaseEvents')
    .select('expiry_time')
    .eq('user_id', userId)
    .order('expiry_time', { ascending: false })
    .limit(1);

  const googleExpiry =
    googleEvents && googleEvents.length > 0 && googleEvents[0].expiry_time
      ? new Date(googleEvents[0].expiry_time)
      : null;
  sources.push({
    provider: 'google',
    isActive: !!googleExpiry && googleExpiry > now,
    expiresAt: googleExpiry,
  });

  // 3. Web (from UserSubscriptions)
  const { data: webSubs } = await supabaseAdmin
    .from('UserSubscriptions')
    .select('current_period_end, status')
    .eq('user_id', userId)
    .limit(1);

  const webSub = webSubs && webSubs.length > 0 ? webSubs[0] : null;
  const webExpiry = webSub?.current_period_end ? new Date(webSub.current_period_end) : null;
  const webActive =
    !!webExpiry && webExpiry > now && ['active', 'pastDue'].includes(webSub?.status ?? '');
  sources.push({
    provider: 'web',
    isActive: webActive,
    expiresAt: webExpiry,
  });

  // Apply overrides (for testing or real-time updates)
  const finalSources = sources.map((s) => {
    const override = overrides?.[s.provider];
    return override ?? s;
  });

  const activeProviders = finalSources.filter((s) => s.isActive).map((s) => s.provider);
  const isPro = activeProviders.length > 0;

  const expiryTimes = finalSources
    .filter((s) => s.isActive && s.expiresAt)
    .map((s) => s.expiresAt as Date);
  const proExpiryTime =
    expiryTimes.length > 0 ? new Date(Math.max(...expiryTimes.map((d) => d.getTime()))) : null;

  return {
    userId,
    isPro,
    activeProviders,
    proExpiryTime,
  };
};
