import { SUBSCRIPTION_LIMITS } from '@/config/subscriptionConfig';
import { supabaseAdmin } from '@/lib/supabase';

export interface StorageQuotaCheckResult {
  allowed: boolean;
  usedStorageBytes: number;
  limitBytes: number;
  isPaid: boolean;
}

export type UsageActionType = 'report_export' | 'follow_up_photo';

export interface UsageConsumptionResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  currentUsage: number;
  isPaid: boolean;
}

export interface UserMonthlyUsageResult {
  reportExportCount: number;
  followUpCount: number;
}

/**
 * Checks if user is paid via manual override (Profiles.is_paid / is_developer)
 * OR via active automated subscription in UserSubscriptions table.
 */
export const checkIsUserPaid = async (userId: string): Promise<boolean> => {
  // 1. Check Profiles for manual override
  const { data: profile } = await supabaseAdmin
    .from('Profiles')
    .select('is_paid, is_developer')
    .eq('id', userId)
    .maybeSingle();

  if (profile?.is_paid || profile?.is_developer) {
    return true;
  }

  // 2. Check UserSubscriptions for active automated subscription
  const { data: sub } = await supabaseAdmin
    .from('UserSubscriptions')
    .select('status, plan, expires_at, current_period_end')
    .eq('user_id', userId)
    .maybeSingle();

  if (!sub) return false;

  const isActiveStatus = sub.status === 'active';
  const expirationDate = sub.expires_at || sub.current_period_end;
  const isNotExpired = expirationDate ? new Date(expirationDate).getTime() > Date.now() : true;

  return isActiveStatus && isNotExpired;
};

/**
 * Checks if a user has sufficient storage quota remaining.
 */
export const checkUserStorageQuota = async (
  userId: string,
  additionalBytes: number = 0,
  projectId?: string | null
): Promise<StorageQuotaCheckResult> => {
  const isPaid = await checkIsUserPaid(userId);
  const limits = isPaid ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium;

  let query = supabaseAdmin.from('Photos').select('file_size').eq('user_id', userId);
  if (projectId) {
    query = supabaseAdmin
      .from('Photos')
      .select('file_size')
      .or(`user_id.eq.${userId},project_id.eq.${projectId}`);
  }

  const { data: photosData } = await query;

  const usedStorageBytes = photosData?.reduce((sum, photo) => sum + (photo.file_size || 0), 0) || 0;

  const allowed = usedStorageBytes + additionalBytes <= limits.storageLimitBytes;

  return {
    allowed,
    usedStorageBytes,
    limitBytes: limits.storageLimitBytes,
    isPaid,
  };
};

/**
 * Retrieves monthly feature usage counts for the current calendar month.
 */
export const getUserMonthlyUsage = async (userId: string): Promise<UserMonthlyUsageResult> => {
  const now = new Date();
  const startOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

  try {
    const { data: logs, error } = await supabaseAdmin
      .from('UserUsageLogs')
      .select('action_type')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth);

    if (error) {
      console.warn('[UsageGuard] Failed to query UserUsageLogs:', error.message);
      return { reportExportCount: 0, followUpCount: 0 };
    }

    const reportExportCount = logs?.filter((l) => l.action_type === 'report_export').length || 0;
    const followUpCount = logs?.filter((l) => l.action_type === 'follow_up_photo').length || 0;

    return { reportExportCount, followUpCount };
  } catch (err) {
    console.error('[UsageGuard] Error retrieving monthly usage:', err);
    return { reportExportCount: 0, followUpCount: 0 };
  }
};

/**
 * Validates and consumes one unit of monthly feature usage.
 */
export const consumeUserUsage = async (
  userId: string,
  actionType: UsageActionType,
  metadata?: Record<string, unknown>
): Promise<UsageConsumptionResult> => {
  const isPaid = await checkIsUserPaid(userId);
  const limits = isPaid ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium;
  const limit =
    actionType === 'report_export' ? limits.reportExportMonthlyLimit : limits.followUpMonthlyLimit;

  // Paid users have unlimited access
  if (isPaid || limit === Infinity) {
    try {
      await supabaseAdmin.from('UserUsageLogs').insert({
        user_id: userId,
        action_type: actionType,
        metadata: metadata || null,
      });
    } catch (err) {
      console.warn('[UsageGuard] Non-blocking insert error for paid user:', err);
    }

    return {
      allowed: true,
      remaining: Infinity,
      limit: Infinity,
      currentUsage: 0,
      isPaid: true,
    };
  }

  const { reportExportCount, followUpCount } = await getUserMonthlyUsage(userId);
  const currentUsage = actionType === 'report_export' ? reportExportCount : followUpCount;

  if (currentUsage >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      currentUsage,
      isPaid: false,
    };
  }

  // Insert usage record
  try {
    const { error: insertError } = await supabaseAdmin.from('UserUsageLogs').insert({
      user_id: userId,
      action_type: actionType,
      metadata: metadata || null,
    });

    if (insertError) {
      console.error('[UsageGuard] Failed to record usage:', insertError);
    }
  } catch (err) {
    console.error('[UsageGuard] Exception during usage recording:', err);
  }

  const newUsage = currentUsage + 1;
  return {
    allowed: true,
    remaining: Math.max(0, limit - newUsage),
    limit,
    currentUsage: newUsage,
    isPaid: false,
  };
};
