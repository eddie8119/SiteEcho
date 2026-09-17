import type { ApiResult } from '@/types/request';

import request from '@/utils/request';

export type SendFeedbackPayload = {
  subject: string;
  html: string;
  text?: string;
};

export const feedbackApi = {
  sendFeedback: (payload: SendFeedbackPayload): Promise<ApiResult> => {
    return request.post('/feedback', payload);
  },
};
