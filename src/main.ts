import { App as CapacitorApp } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';
import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import { createPinia } from 'pinia';
import PrimeVue from 'primevue/config';
import * as vue from 'vue';

import './style.css';
import App from './App.vue';
import i18n from './i18n';
import router from './router';

import { appleIapService } from '@/services/appleIapService';
import { initializeAuthService } from '@/services/auth';
import { logError, logWarn } from '@/utils/logger';

const app = vue.createApp(App);

const queryClient = new QueryClient();
const pinia = createPinia();

app.use(VueQueryPlugin, { queryClient });
app.use(pinia);

const authService = initializeAuthService(pinia);

// Initialize AuthService (sets up Supabase session listener)
await authService.initialize();

app.use(router);
app.use(i18n);
app.use(ElementPlus);
app.use(PrimeVue);

// App URL (Universal Links / Deep Links / OAuth callback) 處理函數
async function handleIncomingUrl(url: string) {
  // 1. 處理專案邀請連結 (https://SiteNear.app/invite/{token} 或 SiteNear://invite/{token})
  try {
    const parsedUrl = new URL(url);

    // Universal Link: https://SiteNear.app/invite/...
    if (
      (parsedUrl.hostname === 'SiteNear.app' || parsedUrl.hostname === 'www.SiteNear.app') &&
      parsedUrl.pathname.startsWith('/invite/')
    ) {
      const token = parsedUrl.pathname.replace('/invite/', '').trim();
      if (token) {
        await router.push(`/invite/${token}`);
        return;
      }
    }

    // Custom scheme: SiteNear://invite/...
    if (url.startsWith('SiteNear://invite/')) {
      const token = url.replace('SiteNear://invite/', '').split('?')[0].trim();
      if (token) {
        await router.push(`/invite/${token}`);
        return;
      }
    }
  } catch (error) {
    logWarn('[Deep Link] Failed to parse incoming URL:', error, 'DeepLink');
  }

  // 2. OAuth callback 處理
  if (
    !url.startsWith('SiteNear://auth/callback') &&
    !url.startsWith('SiteNear://auth/sso/callback')
  ) {
    return;
  }

  try {
    const parsedUrl = new URL(url);
    const code = parsedUrl.searchParams.get('code');
    const errorDescription = parsedUrl.searchParams.get('error_description');

    if (errorDescription) {
      throw new Error(errorDescription);
    }

    if (!code) {
      throw new Error('OAuth callback 缺少 authorization code');
    }

    const session = await authService.exchangeOAuthCode(code);

    if (!session.refresh_token) {
      logWarn('[OAuth Callback] Session is missing refresh token', undefined, 'OAuth');
    }

    authService.applySession({
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      role: 'user',
      source: 'supabase',
    });

    try {
      await Browser.close();
    } catch {
      // Browser 可能已經關閉
    }

    await router.replace('/mobile/timeline');
  } catch (error) {
    logError('[OAuth Callback] OAuth callback failed:', error, 'OAuth');
    try {
      await Browser.close();
    } catch {
      // Browser 可能已經關閉
    }
  }
}

// 初始化 App URL (Universal Links / Deep Links) 監聽器
async function initializeAppUrlListener() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  // 監聽 appUrlOpen 事件
  await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
    void handleIncomingUrl(url);
  });

  // 檢查冷啟動情況
  const launchUrl = await CapacitorApp.getLaunchUrl();
  if (launchUrl?.url) {
    await handleIncomingUrl(launchUrl.url);
  }
}

// 初始化 URL 監聽器
initializeAppUrlListener();
// Stage 2: Initialize Apple IAP singleton service
if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios') {
  void appleIapService.initialize();
}

//
// initializeClarity();
// initializeGA();
// Track initial page and subsequent route changes for GA
// router.isReady().then(() => {
//   trackPageview(router.currentRoute.value.fullPath);
//   router.afterEach((to) => {
//     trackPageview(to.fullPath);
//     });
//   });

app.mount('#app');

// Cleanup on app unmount
window.addEventListener('beforeunload', () => {
  authService.dispose();
});
