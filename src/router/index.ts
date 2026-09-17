import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

import DesktopLayout from '@/layouts/DesktopLayout.vue';
import MobileLayout from '@/layouts/MobileLayout.vue';
import { getAuthService } from '@/services/auth';
import { isAccessTokenValid } from '@/utils/auth';
import { LOGIN_REQUIRED_MESSAGE_KEY, promptLoginRequired } from '@/utils/authPrompt';
import { detectDevice } from '@/utils/deviceDetector';
import { shouldUseMobileLayout } from '@/utils/deviceDetector';
import { syncDocumentMeta } from '@/utils/seoMeta';
import { markVisited } from '@/utils/visitTracker';

const routes: Array<RouteRecordRaw> = [
  // === App Initializer ===
  {
    name: 'app-initializer',
    path: '/app-initializer',
    component: () => import('../pages/mobile/app-initializer/index.vue'),
    meta: { requiresAuth: false },
  },

  // === PWA ===
  {
    path: '/mobile',
    component: MobileLayout,
    meta: {
      isMobile: true,
      requiresAuth: false,
      seo: {
        noindex: true,
      },
    },
    children: [
      {
        name: 'mobile-setting',
        path: 'setting',
        component: () => import('../pages/mobile/setting/index.vue'),
        meta: { requiresAuth: false },
      },
      {
        name: 'timeline',
        path: 'timeline',
        component: () => import('../pages/mobile/timeline/index.vue'),
        meta: { requiresAuth: false, showFab: false },
      },
      {
        name: 'camera',
        path: 'take-photo',
        component: () => import('../pages/mobile/take-photo/index.vue'),
        meta: { requiresAuth: false },
      },
      {
        name: 'pending',
        path: 'pending',
        component: () => import('../pages/mobile/pending/index.vue'),
        meta: { requiresAuth: false },
      },
      {
        name: 'mobile-user',
        path: 'user',
        redirect: { name: 'mobile-change-password' },
        meta: { showQuickPlan: false, requiresAuth: false },
        children: [
          {
            name: 'mobile-profile',
            path: 'profile',
            component: () => import('../pages/protected/user/profile.vue'),
            meta: { requiresAuth: false },
          },
          {
            name: 'mobile-change-password',
            path: 'change-password',
            component: () => import('../pages/mobile/change-password/index.vue'),
            meta: { requiresAuth: false },
          },
          {
            name: 'mobile-collaborators',
            path: 'collaborators',
            component: () => import('../pages/protected/user/collaborators.vue'),
            meta: { requiresAuth: false },
          },
          {
            name: 'mobile-pricing-menu',
            path: 'pricing-menu',
            component: () => import('../pages/protected/user/pricing-menu.vue'),
            meta: { requiresAuth: false },
          },
          {
            name: 'mobile-subscription',
            path: 'subscription',
            component: () => import('../pages/protected/user/subscription.vue'),
            meta: { requiresAuth: false },
          },
        ],
      },
      // {
      //   name: 'photo-preview',
      //   path: 'photo-preview/:id',
      //   component: () => import('../pages/mobile/photo-preview/index.vue'),
      //   meta: { requiresAuth: false },
      // },
      {
        name: 'photo-edit',
        path: 'photo-edit/:id',
        component: () => import('../pages/mobile/photo-edit/index.vue'),
        meta: { requiresAuth: false },
      },
      {
        name: 'project-management',
        path: 'project-management',
        component: () => import('../pages/mobile/project-management/index.vue'),
        meta: { requiresAuth: false },
      },
      {
        name: 'trash',
        path: 'trash',
        component: () => import('../pages/mobile/trash/index.vue'),
        meta: { requiresAuth: false },
      },
    ],
  },

  // === 桌面端 Web 路由 ===
  {
    path: '/desktop',
    component: DesktopLayout,
    meta: {
      isWeb: true,
      requiresAuth: false,
      seo: {
        noindex: true,
      },
    },
    children: [
      {
        name: 'overview',
        path: 'overview',
        component: () => import('../pages/protected/desktop/overview/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        name: 'desktop-photos',
        path: 'photos',
        component: () => import('../pages/protected/desktop/photos/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        name: 'desktop-trash',
        path: 'trash',
        component: () => import('../pages/protected/desktop/trash/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        name: 'schedule',
        path: 'schedule',
        component: () => import('../pages/protected/schedule/index.vue'),
        meta: { requiresAuth: true },
      },
      {
        name: 'user',
        path: 'user',
        component: () => import('../pages/protected/user/index.vue'),
        redirect: { name: 'change-password' },
        meta: { showQuickPlan: false, requiresAuth: true },
        children: [
          {
            name: 'profile',
            path: 'profile',
            component: () => import('../pages/protected/user/profile.vue'),
            meta: { requiresAuth: true },
          },
          {
            name: 'change-password',
            path: 'change-password',
            component: () => import('../pages/protected/user/ChangePassword.vue'),
            meta: { requiresAuth: true },
          },
          {
            name: 'collaborators',
            path: 'collaborators',
            component: () => import('../pages/protected/user/collaborators.vue'),
            meta: { requiresAuth: true },
          },
          {
            name: 'pricing-menu',
            path: 'pricing-menu',
            component: () => import('../pages/protected/user/pricing-menu.vue'),
            meta: { requiresAuth: true },
          },
          {
            name: 'subscription',
            path: 'subscription',
            component: () => import('../pages/protected/user/subscription.vue'),
            meta: { requiresAuth: true },
          },
        ],
      },
      {
        name: 'reports',
        path: 'reports',
        component: () => import('../pages/protected/desktop/reports/index.vue'),
        meta: { requiresAuth: true },
      },
    ],
  },

  // === 設備自動檢測路由 ===
  {
    path: '/redirect',
    name: 'device-redirect',
    component: () => import('../pages/mobile/device-redirect/index.vue'),
  },

  // === 原有的公開路由 ===
  {
    path: '/invite/:token',
    name: 'invitation-landing',
    component: () => import('../views/invitation-accept.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/invitation/accept',
    name: 'invitation-accept-query',
    component: () => import('../views/invitation-accept.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/privacy',
    name: 'privacy',
    component: () => import('../pages/mobile/privacy/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/support',
    name: 'support',
    component: () => import('../pages/mobile/support/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/terms',
    name: 'terms',
    component: () => import('../pages/mobile/terms/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/delete-account',
    name: 'delete-account',
    component: () => import('../pages/mobile/delete-account/index.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/en',
    name: 'english-landing',
    component: () => import('../pages/public/english-landing.vue'),
    meta: {
      public: true,

      seo: {
        titleKey: 'meta.routes.englishLanding.title',
        descriptionKey: 'meta.routes.englishLanding.description',
      },
    },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('../pages/404.vue'),
  },
  {
    path: '/auth',
    name: 'auth',
    component: () => import('../layouts/AuthLayout.vue'),

    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('../pages/auth/Login.vue'),
      },
      {
        path: 'register',
        name: 'register',
        component: () => import('../pages/auth/Register.vue'),
      },
      {
        path: 'registration-success',
        name: 'registration-success',
        component: () => import('../pages/auth/RegistrationSuccess.vue'),
      },
      {
        path: 'account-activation',
        name: 'account-activation',
        component: () => import('../pages/auth/AccountActivation.vue'),
      },
      {
        path: 'forgot-password',
        name: 'forgot-password',
        component: () => import('../pages/auth/ForgotPassword.vue'),
      },
      {
        path: 'reset-password',
        name: 'reset-password',
        component: () => import('../pages/auth/ResetPassword.vue'),
      },
      {
        path: 'resend-activation',
        name: 'resend-activation',
        component: () => import('../pages/auth/ResendActivation.vue'),
      },
      {
        path: 'sso/callback',
        name: 'sso-callback',
        component: () => import('../pages/auth/SsoCallback.vue'),
      },
    ],
  },
  {
    path: '/',
    name: 'landing',
    component: () => import('@/pages/landing/index.vue'),
    meta: {
      requiresAuth: false,
      layout: 'landing',
      seo: {
        titleKey: 'meta.routes.landing.title',
        descriptionKey: 'meta.routes.landing.description',
      },
    },
  },
  {
    path: '/more-apps',
    name: 'more-apps',
    component: () => import('@/pages/landing/more-apps.vue'),
    meta: {
      requiresAuth: false,
      layout: 'landing',
      seo: {
        titleKey: 'meta.routes.moreApps.title',
        descriptionKey: 'meta.routes.moreApps.description',
      },
    },
  },
  {
    path: '/pricing-menu',
    name: 'pricing-menu',
    component: () => import('@/pages/landing/pricing-menu.vue'),
    meta: {
      requiresAuth: false,
      layout: 'landing',
      seo: {
        titleKey: 'meta.routes.pricingMenu.title',
        descriptionKey: 'meta.routes.pricingMenu.description',
      },
    },
  },
  // cancel
  {
    path: '/take-photo',
    name: 'take-photo',
    redirect: () => {
      // 根據設備類型重定向到對應的相機頁面
      const useMobile = shouldUseMobileLayout();
      return useMobile ? '/mobile/take-photo' : '/desktop/take-photo';
    },
  },

  // === 原有的 App 路由 (保持相容性) ===
  {
    path: '/app',
    component: DesktopLayout,
    meta: {
      seo: {
        noindex: true,
      },
    },
    children: [
      // Setting routes
      {
        name: 'app-setting',
        path: 'setting',
        component: () => import('../pages/protected/setting/index.vue'),
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, _from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
      };
    }

    return { top: 0 };
  },
});

// Navigation guard
router.beforeEach((to, _from, next) => {
  const hasValidToken = isAccessTokenValid();

  // Allow Supabase recovery callback to pass through regardless of auth state
  const isSupabaseRecovery = typeof to.hash === 'string' && to.hash.includes('type=recovery');
  if (isSupabaseRecovery && to.name !== 'reset-password') {
    return next({ name: 'reset-password', hash: to.hash });
  }

  // Smart routing for root path
  if (to.path === '/' && to.name === 'landing') {
    const device = detectDevice();

    // Native app (Capacitor): redirect to timeline
    if (device.isCapacitor) {
      return next({ path: '/mobile/timeline' });
    }

    // PWA browser (standalone but not Capacitor): show landing page
    if (device.isPWA) {
      return next();
    }

    // Mobile browser (not PWA): go directly to timeline
    if (device.isMobile) {
      markVisited();
      return next({ path: '/mobile/timeline' });
    }

    // Desktop browser: smart routing based on login status
    if (hasValidToken) {
      // Logged in: direct to overview
      markVisited();
      return next({ name: 'overview' });
    } else {
      // Not logged in: show landing page
      markVisited();
      return next();
    }
  }

  // If user is already logged in and tries to access login/register pages, redirect to home
  if (hasValidToken && (to.name === 'login' || to.name === 'register')) {
    const device = detectDevice();
    if (device.isCapacitor || device.isMobile) {
      return next({ path: '/mobile/timeline' });
    } else {
      return next({ name: 'overview' });
    }
  }

  // Check if the route requires authentication
  if (to.meta?.requiresAuth === true) {
    if (!hasValidToken) {
      // Not authenticated, redirect to login with the original path as a query param
      void getAuthService().logout({ revokeRemote: false });
      void promptLoginRequired({
        messageKey: LOGIN_REQUIRED_MESSAGE_KEY,
        onAfterPrompt: () =>
          next({
            name: 'login',
            query: { redirect: to.fullPath },
          }),
      });
      return;
    }
  }

  // For all other cases, allow navigation
  next();
});

router.afterEach((to) => {
  syncDocumentMeta(to);
});

export default router;
