import { Capacitor } from '@capacitor/core';

import type { RouteLocationNormalized } from 'vue-router';

/**
 * Camera page utilities for platform-specific logic
 */

const CAMERA_ROUTE_NAME = 'camera';

/**
 * Check if the current route is the camera page
 */
export function isCameraRoute(route: RouteLocationNormalized | string): boolean {
  const routeName = typeof route === 'string' ? route : route.name;
  return routeName === CAMERA_ROUTE_NAME;
}

/**
 * Check if running on native platform (iOS/Android)
 */
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Check if currently on camera page and running on native platform
 */
export function isNativeCameraPage(route: RouteLocationNormalized): boolean {
  return isCameraRoute(route) && isNativePlatform();
}

/**
 * Check if currently on camera page and running on browser
 */
export function isBrowserCameraPage(route: RouteLocationNormalized): boolean {
  return isCameraRoute(route) && !isNativePlatform();
}
