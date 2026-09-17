import { Request, Response } from 'express';

import { SUBSCRIPTION_LIMITS } from '@/config/subscriptionConfig';
import { supabaseAdmin } from '@/lib/supabase';
import { AuthenticatedRequest } from '@/types/requests';
import { AppError, handleControllerError } from '@/utils/controllerError';
import {
  checkIsUserPaid,
  consumeUserUsage,
  getUserMonthlyUsage,
  UsageActionType,
} from '@/utils/storageGuard';

export const getUserSubscriptionInfo = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;

    // 未登入用戶：返回預設 freemium 狀態
    if (!userId) {
      return res.json({
        success: true,
        data: {
          subscription: null,
          subscriptionType: 'freemium',
          limits: SUBSCRIPTION_LIMITS.freemium,
        },
      });
    }

    // 檢查付費狀態 (包含 Profiles.is_paid 手動覆蓋與 UserSubscriptions 自動訂閱)
    const isSubscribed = await checkIsUserPaid(userId);

    // 查詢真實的 UserSubscriptions 記錄 (用於傳回前端)
    const { data: subscription } = await supabaseAdmin
      .from('UserSubscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    // 查詢實際的儲存使用量
    const { data: photosData, error: photosError } = await supabaseAdmin
      .from('Photos')
      .select('file_size')
      .eq('user_id', userId);

    if (photosError) {
      console.error('Failed to fetch photos for storage calculation:', photosError);
    }

    const photoCount = photosData?.length || 0;
    const usedStorageBytes =
      photosData?.reduce((sum, photo) => sum + (photo.file_size || 0), 0) || 0;

    // 獲取對應的儲存限制並填入實際使用量
    const baseLimits = isSubscribed ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium;
    const { reportExportCount, followUpCount } = await getUserMonthlyUsage(userId);
    const remainingReportExports =
      baseLimits.reportExportMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, baseLimits.reportExportMonthlyLimit - reportExportCount);
    const remainingFollowUps =
      baseLimits.followUpMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, baseLimits.followUpMonthlyLimit - followUpCount);

    const limits = {
      ...baseLimits,
      usedStorageBytes,
      photoCount,
      usedReportExports: reportExportCount,
      usedFollowUps: followUpCount,
      remainingReportExports,
      remainingFollowUps,
    };

    return res.json({
      success: true,
      data: {
        subscription,
        subscriptionType: isSubscribed ? 'paid' : 'freemium',
        limits,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get subscription info error');
  }
};

export const getSubscriptionLimits = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const isSubscribed = await checkIsUserPaid(userId);

    // 查詢實際的儲存使用量
    const { data: photosData, error: photosError } = await supabaseAdmin
      .from('Photos')
      .select('file_size')
      .eq('user_id', userId);

    if (photosError) {
      console.error('Failed to fetch photos for storage calculation:', photosError);
    }

    const photoCount = photosData?.length || 0;
    const usedStorageBytes =
      photosData?.reduce((sum, photo) => sum + (photo.file_size || 0), 0) || 0;

    // 獲取對應的儲存限制並填入實際使用量
    const baseLimits = isSubscribed ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium;
    const { reportExportCount, followUpCount } = await getUserMonthlyUsage(userId);
    const remainingReportExports =
      baseLimits.reportExportMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, baseLimits.reportExportMonthlyLimit - reportExportCount);
    const remainingFollowUps =
      baseLimits.followUpMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, baseLimits.followUpMonthlyLimit - followUpCount);

    const limits = {
      ...baseLimits,
      usedStorageBytes,
      photoCount,
      usedReportExports: reportExportCount,
      usedFollowUps: followUpCount,
      remainingReportExports,
      remainingFollowUps,
    };

    return res.json({
      success: true,
      data: {
        subscriptionType: isSubscribed ? 'paid' : 'freemium',
        limits,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get subscription limits error');
  }
};

// Get subscription limits for a project (checks project owner's subscription)
// This is used for collaborators to inherit the owner's subscription benefits
export const getProjectSubscriptionLimits = async (
  projectId: string
): Promise<{ subscriptionType: string; limits: { maxMembers: number } }> => {
  try {
    // Get project owner
    const { data: project } = await supabaseAdmin
      .from('Projects')
      .select('user_id')
      .eq('id', projectId)
      .single();

    if (!project) {
      throw new AppError('Project not found', {
        statusCode: 404,
        code: 'PROJECT_NOT_FOUND',
      });
    }

    const isSubscribed = await checkIsUserPaid(project.user_id);

    return {
      subscriptionType: isSubscribed ? 'paid' : 'freemium',
      limits: isSubscribed ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium,
    };
  } catch (error) {
    console.error('Error getting project subscription limits:', error);
    // Return freemium limits as fallback
    return {
      subscriptionType: 'freemium',
      limits: SUBSCRIPTION_LIMITS.freemium,
    };
  }
};

// Get project subscription info (for collaborators to inherit owner's subscription)
export const getProjectSubscriptionInfo = async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string;
    if (!projectId) {
      throw new AppError('Project ID is required', {
        statusCode: 400,
        code: 'MISSING_PROJECT_ID',
      });
    }

    const { subscriptionType, limits } = await getProjectSubscriptionLimits(projectId);

    return res.json({
      success: true,
      data: {
        subscription: null,
        subscriptionType,
        limits,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get project subscription info error');
  }
};

/**
 * Consumes monthly feature usage (e.g. report export or follow-up photo creation)
 */
export const consumeUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { actionType, metadata } = req.body as {
      actionType?: UsageActionType;
      metadata?: Record<string, unknown>;
    };

    if (!actionType || (actionType !== 'report_export' && actionType !== 'follow_up_photo')) {
      throw new AppError('Invalid actionType. Must be report_export or follow_up_photo', {
        statusCode: 400,
        code: 'INVALID_ACTION_TYPE',
      });
    }

    const result = await consumeUserUsage(userId, actionType, metadata);

    if (!result.allowed) {
      return res.status(403).json({
        success: false,
        code: 'USAGE_LIMIT_EXCEEDED',
        message: `Monthly limit reached for ${actionType}. Please upgrade to Pro for unlimited usage.`,
        data: result,
      });
    }

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Consume usage error');
  }
};

/**
 * Get current user monthly feature usage
 */
export const getUserUsage = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('User not authenticated', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const isPaid = await checkIsUserPaid(userId);
    const limits = isPaid ? SUBSCRIPTION_LIMITS.paid : SUBSCRIPTION_LIMITS.freemium;
    const { reportExportCount, followUpCount } = await getUserMonthlyUsage(userId);

    const remainingReportExports =
      limits.reportExportMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, limits.reportExportMonthlyLimit - reportExportCount);
    const remainingFollowUps =
      limits.followUpMonthlyLimit === Infinity
        ? Infinity
        : Math.max(0, limits.followUpMonthlyLimit - followUpCount);

    return res.json({
      success: true,
      data: {
        isPaid,
        usedReportExports: reportExportCount,
        usedFollowUps: followUpCount,
        reportExportMonthlyLimit: limits.reportExportMonthlyLimit,
        followUpMonthlyLimit: limits.followUpMonthlyLimit,
        remainingReportExports,
        remainingFollowUps,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get user usage error');
  }
};
