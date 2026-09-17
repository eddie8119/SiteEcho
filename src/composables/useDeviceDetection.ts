/**
 * 設備檢測 Composable
 * 提供響應式的設備檢測功能
 */

import { computed, onUnmounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import {
  detectDevice,
  getDeviceType,
  getScreenSize,
  shouldUseMobileLayout,
} from '@/utils/deviceDetector';

export function useDeviceDetection() {
  const route = useRoute();
  const windowWidth = ref(window.innerWidth);

  // 設備資訊
  const device = computed(() => detectDevice());

  // 設備類型
  const deviceType = computed(() => getDeviceType());

  // 螢幕尺寸
  const screenSize = computed(() => getScreenSize());

  // 是否為移動端
  const isMobile = computed(() => device.value.isMobile);

  // 是否為平板
  const isTablet = computed(() => device.value.isTablet);

  // 是否為桌面端
  const isDesktop = computed(() => device.value.isDesktop);

  // 是否為 PWA
  const isPWA = computed(() => device.value.isPWA);

  // 是否為 Capacitor native app
  const isCapacitor = computed(() => device.value.isCapacitor);

  // 是否應該使用移動端佈局
  const shouldUseMobile = computed(() => shouldUseMobileLayout());

  // 當前路由類型
  const routeType = computed(() => {
    if (route.path.startsWith('/mobile')) return 'mobile';
    if (route.path.startsWith('/desktop')) return 'desktop';
    if (route.path.startsWith('/app')) return 'app';
    return 'unknown';
  });

  // 是否為移動端路由
  const isMobileRoute = computed(() => routeType.value === 'mobile');

  // 是否為桌面端路由
  const isWebRoute = computed(() => routeType.value === 'desktop');

  // 是否為相容性路由
  const isAppRoute = computed(() => routeType.value === 'app');

  // 獲取對應的設備路由路徑
  const getDeviceRoute = (path: string) => {
    const baseRoute = path.replace(/^\/(mobile|desktop|app)\//, '/');
    const useMobile = shouldUseMobileLayout();
    return useMobile ? `/mobile${baseRoute}` : `/desktop${baseRoute}`;
  };

  // 獲取當前頁面的對應設備路由
  const _getCurrentDeviceRoute = () => {
    const currentPath = route.path;
    const baseRoute = currentPath.replace(/^\/(mobile|desktop|app)\//, '/');
    return getDeviceRoute(baseRoute);
  };

  // 更新視窗寬度
  const updateWindowWidth = () => {
    windowWidth.value = window.innerWidth;
  };

  // 監聽視窗大小變化
  onUnmounted(() => {
    window.removeEventListener('resize', updateWindowWidth);
  });

  return {
    // 設備資訊
    device: device.value,
    deviceType,
    screenSize,
    windowWidth,

    // 布林值
    isMobile,
    isTablet,
    isDesktop,
    isPWA,
    isCapacitor,
    shouldUseMobile,

    // 路由資訊
    routeType,
    isMobileRoute,
    isWebRoute,
    isAppRoute,

    // 工具方法
    getDeviceRoute,
    getCurrentDeviceRoute: _getCurrentDeviceRoute,
  };
}

/**
 * 設備特定的路由導航 Composable
 */
export function useDeviceNavigation() {
  const { shouldUseMobile } = useDeviceDetection();

  // 導航到適合的設備路由
  const navigateToDeviceRoute = (route: string) => {
    const deviceRoute = shouldUseMobile.value ? `/mobile${route}` : `/desktop${route}`;
    return deviceRoute;
  };

  // 獲取首頁路由
  const getHomeRoute = () => {
    return shouldUseMobile.value ? '/mobile/timeline' : '/desktop/overview';
  };

  // 獲取相機路由
  const getCameraRoute = () => {
    return '/take-photo'; // 保持公開路由
  };

  // 獲取用戶路由
  const getUserRoute = () => {
    return shouldUseMobile.value ? '/mobile/user' : '/desktop/user';
  };

  return {
    navigateToDeviceRoute,
    getHomeRoute,
    getCameraRoute,
    getUserRoute,
  };
}
