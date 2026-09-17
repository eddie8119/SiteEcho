/**
 * Landing Page Route Composable
 * 提供基於認證狀態和設備類型的動態路由邏輯
 * 用於 landing page 的 CTA 按鈕導航
 */

import { computed, type ComputedRef } from 'vue';

import type { RouteLocationRaw } from 'vue-router';

import { isAccessTokenValid } from '@/utils/auth';
import { detectDevice } from '@/utils/deviceDetector';

export interface UseLandingRouteReturn {
  landingRoute: ComputedRef<RouteLocationRaw>;
}

export const useLandingRoute = (): UseLandingRouteReturn => {
  // 計算 landing page CTA 按鈕的目標路由
  const landingRoute = computed<RouteLocationRaw>(() => {
    const hasValidToken = isAccessTokenValid();
    const device = detectDevice();

    // Mobile and Tablet (including PWA browser): always go to timeline (no login required)
    if (device.isMobile || device.isTablet) {
      return { path: '/mobile/timeline' };
    }

    // Desktop: check login status
    if (hasValidToken) {
      return { name: 'overview' };
    }

    return '/auth/login';
  });

  return {
    landingRoute,
  };
};
