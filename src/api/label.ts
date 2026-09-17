import type { AxiosResponse } from 'axios';

import request from '@/utils/request';

interface GetLabelsParams {
  label?: string;
  alarm_status?: string;
}

export const labelApi = {
  // device statuses
  getLabels(): Promise<AxiosResponse> {
    return request.get('/labels/device-statuses/');
  },
  getAlarmRecords(params?: GetLabelsParams): Promise<AxiosResponse> {
    return request.get(`/labels/alarm-records/`, { params });
  },
};
