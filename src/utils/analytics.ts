import { logError } from '@/utils/logger';

export enum AnalyticsEvent {
  PHOTOS_CREATED = 'photosCreated',
  BATCH_USED = 'batchUsed',
  FILTER_USED = 'filterUsed',
}

const ANALYTICS_KEY = 'analytics';

export interface AnalyticsData {
  photosCreated: number;
  batchUsed: number;
  filterUsed: number;
}

const DEFAULT_ANALYTICS_DATA: AnalyticsData = {
  photosCreated: 0,
  batchUsed: 0,
  filterUsed: 0,
};

export function getAnalytics(): AnalyticsData {
  try {
    const raw = localStorage.getItem(ANALYTICS_KEY);
    if (!raw) return { ...DEFAULT_ANALYTICS_DATA };
    const parsed = JSON.parse(raw) as Partial<AnalyticsData>;
    return {
      photosCreated: parsed.photosCreated ?? 0,
      batchUsed: parsed.batchUsed ?? 0,
      filterUsed: parsed.filterUsed ?? 0,
    };
  } catch (error) {
    logError('Failed to read analytics:', error, 'Analytics');
    return { ...DEFAULT_ANALYTICS_DATA };
  }
}

export function clearAnalytics(): void {
  try {
    localStorage.removeItem(ANALYTICS_KEY);
  } catch (error) {
    logError('Failed to clear analytics:', error, 'Analytics');
  }
}

export function track(event: AnalyticsEvent): void {
  try {
    const data: AnalyticsData = getAnalytics();
    const key = event as keyof AnalyticsData;
    data[key] = (data[key] || 0) + 1;
    localStorage.setItem(ANALYTICS_KEY, JSON.stringify(data));
  } catch (error) {
    logError('Failed to track analytics event:', error, 'Analytics');
  }
}
