/**
 * 訪問記錄追蹤工具
 * 用於判斷用戶是否為首次訪問或回訪
 */

import { logError } from '@/utils/logger';

const VISIT_TRACKER_KEY = 'SiteNear_visit_tracker';

export interface VisitTrackerData {
  hasVisited: boolean;
  firstVisitTime?: number;
  lastVisitTime?: number;
}

/**
 * 獲取訪問記錄
 */
export function getVisitTracker(): VisitTrackerData | null {
  try {
    const data = localStorage.getItem(VISIT_TRACKER_KEY);
    if (!data) return null;
    return JSON.parse(data) as VisitTrackerData;
  } catch (e) {
    logError('Failed to get visit tracker:', e, 'VisitTracker');
    return null;
  }
}

/**
 * 標記用戶已訪問
 */
export function markVisited(): void {
  try {
    const currentData = getVisitTracker();
    const now = Date.now();

    const newData: VisitTrackerData = {
      hasVisited: true,
      firstVisitTime: currentData?.firstVisitTime || now,
      lastVisitTime: now,
    };

    localStorage.setItem(VISIT_TRACKER_KEY, JSON.stringify(newData));
  } catch (e) {
    logError('Failed to mark visited:', e, 'VisitTracker');
  }
}

/**
 * 判斷是否為首次訪問
 */
export function isFirstTimeVisitor(): boolean {
  const tracker = getVisitTracker();
  return tracker === null || !tracker.hasVisited;
}

/**
 * 判斷是否為回訪用戶
 */
export function isReturningVisitor(): boolean {
  return !isFirstTimeVisitor();
}
