/**
 * 設備檢測工具
 * 用於判斷當前設備類型並提供相關功能
 */

import { Capacitor } from '@capacitor/core';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isIPhone: boolean;
  isPWA: boolean;
  isStandalone: boolean;
  isCapacitor: boolean;
  userAgent: string;
}

/**
 * 檢測當前設備資訊
 */
export function detectDevice(): DeviceInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const standalone = window.matchMedia('(display-mode: standalone)').matches;

  // iOS 檢測（包含 iPadOS 13+）
  const isIOS =
    /iphone|ipad|ipod/.test(userAgent) ||
    (/macintosh/.test(userAgent) && 'ontouchend' in document && navigator.maxTouchPoints > 1);

  // iPhone 專用檢測（排除 iPad）
  const isIPhone = /iphone/.test(userAgent);

  // Android 檢測
  const isAndroid = /android/.test(userAgent);

  // 移動設備檢測
  const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/.test(userAgent);

  // 平板檢測（改進 iPadOS 13+ 檢測）
  const isTablet =
    /ipad|android(?!.*mobile)|tablet/.test(userAgent) ||
    (/macintosh/.test(userAgent) && 'ontouchend' in document && navigator.maxTouchPoints > 1);

  // 桌面端檢測
  const isDesktop = !isMobile && !isTablet;

  // PWA 檢測
  const isPWA =
    standalone ||
    (window.navigator as { standalone?: boolean }).standalone ||
    document.referrer.includes('android-app://');

  // Capacitor native app 檢測
  const isCapacitor = Capacitor.isNativePlatform();

  return {
    isMobile,
    isTablet,
    isDesktop,
    isIOS,
    isAndroid,
    isIPhone,
    isPWA,
    isStandalone: standalone,
    isCapacitor,
    userAgent: navigator.userAgent,
  };
}

export function canInstallPWA(): boolean {
  const device = detectDevice();

  // iOS Safari 11.3+ 支援 PWA
  // Chrome for Android 支援 PWA
  // Edge 支援 PWA

  return device.isIOS || device.isAndroid || 'serviceWorker' in navigator;
}

/**
 * 獲取設備類型字串
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  const device = detectDevice();

  if (device.isTablet) return 'tablet';
  if (device.isMobile) return 'mobile';
  return 'desktop';
}

/**
 * 檢測是否為觸控設備
 */
export function isTouchDevice(): boolean {
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

/**
 * 獲取螢幕尺寸類型
 */
export function getScreenSize(): 'xs' | 'sm' | 'md' | 'lg' | 'xl' {
  const width = window.innerWidth;

  if (width < 640) return 'xs';
  if (width < 768) return 'sm';
  if (width < 1024) return 'md';
  if (width < 1280) return 'lg';
  return 'xl';
}

/**
 * 檢測是否應該使用移動端佈局
 */
export function shouldUseMobileLayout(): boolean {
  const device = detectDevice();
  const screenSize = getScreenSize();

  // PWA 用戶優先使用移動端佈局
  if (device.isPWA) {
    return true;
  }

  // 平板、移動設備或小螢幕使用移動端佈局
  return device.isTablet || device.isMobile || screenSize === 'xs' || screenSize === 'sm';
}

/**
 * 檢測是否支援相機功能
 */
export function supportsCamera(): boolean {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * 檢測是否支援檔案上傳
 */
export function supportsFileUpload(): boolean {
  return typeof FileReader !== 'undefined' && 'File' in window;
}

/**
 * 獲取 PWA 安裝提示狀態
 */
export function getPWAInstallStatus(): {
  canInstall: boolean;
  isInstalled: boolean;
  platform: 'ios' | 'android' | 'desktop' | 'other';
} {
  const device = detectDevice();

  let platform: 'ios' | 'android' | 'desktop' | 'other' = 'other';

  if (device.isIOS) platform = 'ios';
  else if (device.isAndroid) platform = 'android';
  else if (device.isDesktop) platform = 'desktop';

  return {
    canInstall: canInstallPWA(),
    isInstalled: device.isPWA,
    platform,
  };
}
