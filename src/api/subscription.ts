import type {
  SubscriptionInfo,
  SubscriptionLimits,
  UsageActionType,
  UsageConsumption,
  UserUsage,
} from '@/types/billing';
import type { ApiResponse } from '@/types/request';

import request from '@/utils/request';

export const subscriptionApi = {
  getSubscriptionInfo: (): Promise<ApiResponse<SubscriptionInfo>> => {
    return request.get('/subscription/info');
  },
  getSubscriptionLimits: (): Promise<ApiResponse<SubscriptionLimits>> => {
    return request.get('/subscription/limits');
  },
  getProjectSubscriptionInfo: (projectId: string): Promise<ApiResponse<SubscriptionInfo>> => {
    return request.get('/subscription/project-info', { params: { projectId } });
  },
  getUserUsage: (): Promise<ApiResponse<UserUsage>> => {
    return request.get('/subscription/usage');
  },
  consumeUsage: (
    actionType: UsageActionType,
    metadata?: Record<string, unknown>
  ): Promise<ApiResponse<UsageConsumption>> => {
    return request.post('/subscription/usage/consume', { actionType, metadata });
  },
};
