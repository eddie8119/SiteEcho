<template>
  <header class="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/95 backdrop-blur-sm">
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <!-- Logo -->
      <div class="flex items-center">
        <a href="/" class="flex items-center gap-2">
          <img
            src="@/assets/icons/CompanyLogo.png"
            :alt="`Funsugar Logo`"
            class="icon-logo --desktop hidden h-[38px] w-[33px] md:block"
          />
          <img
            src="@/assets/icons/SiteNearLogo.png"
            :alt="`SiteNear Logo`"
            class="icon-logo --desktop h-[30px] w-[86px]"
          />
        </a>
      </div>

      <!-- Navigation Links -->
      <div class="hidden items-center gap-8 md:flex">
        <template v-for="link in navigationLinks" :key="link.label">
          <router-link
            v-if="link.type === 'router' && link.to"
            :to="link.to"
            class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            {{ link.label }}
          </router-link>
          <a
            v-else-if="link.type === 'anchor' && link.href"
            :href="link.href"
            class="text-sm font-medium text-gray-700 transition-colors hover:text-gray-900"
          >
            {{ link.label }}
          </a>
        </template>
      </div>

      <!-- CTA Buttons -->
      <div class="flex items-center gap-4">
        <router-link
          :to="landingRoute"
          class="header-primary-btn hidden md:block"
          @click="onHeaderLoginClick"
        >
          {{ t('landingPage.header.cta_button') }}
        </router-link>
        <HeaderNavActions :nav-items="navItems" class="hidden md:block" />

        <!-- Mobile Menu Button -->
        <button
          class="rounded-lg p-2 hover:bg-gray-100 md:hidden"
          aria-label="Toggle menu"
          @click="toggleMobileMenu"
        >
          <svg
            v-if="!showMobileMenu"
            class="h-6 w-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
          <svg
            v-else
            class="h-6 w-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </nav>

    <!-- Mobile Menu -->
    <div v-if="showMobileMenu" class="relative z-40 border-t border-gray-100 bg-white md:hidden">
      <div class="flex flex-col px-4 py-4 sm:px-6">
        <template v-for="link in navigationLinks" :key="link.label">
          <router-link
            v-if="link.type === 'router' && link.to"
            :to="link.to"
            class="py-2 text-base font-medium text-gray-700 transition-colors hover:text-gray-900"
            @click="closeMobileMenu"
          >
            {{ link.label }}
          </router-link>
          <a
            v-else-if="link.type === 'anchor' && link.href"
            :href="link.href"
            class="py-2 text-base font-medium text-gray-700 transition-colors hover:text-gray-900"
            @click="closeMobileMenu"
          >
            {{ link.label }}
          </a>
        </template>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { NavItem } from '@/types/layout';

import HeaderNavActions from '@/components/core/header/HeaderNavActions.vue';
import { useLandingRoute } from '@/composables/useLandingRoute';
import { useLocale } from '@/composables/useLocale';
import { useLocaleLink } from '@/composables/useLocaleLink';
import { Language } from '@/types/language';
// import { trackEvent } from '@/utils/ga';

interface NavigationLink {
  label: string;
  type: 'router' | 'anchor';
  to?: string;
  href?: string;
}

const emit = defineEmits<{
  (e: 'mobile-menu-toggle'): void;
}>();

const showMobileMenu = ref(false);

const { t } = useI18n();
const { landingRoute } = useLandingRoute();
const { languages, handleLanguageChange } = useLocale();
const { notionManualLink } = useLocaleLink();

const toggleMobileMenu = () => {
  showMobileMenu.value = !showMobileMenu.value;
  emit('mobile-menu-toggle');
};

const handleLanguageSelect = (code: string): void => {
  handleLanguageChange(code as Language);
};

const navItems = computed<NavItem[]>(() => [
  {
    id: 1,
    name: 'Global',
    icon: 'Global',
    label: t('common.language'),
    action: handleLanguageSelect,
    dropdownItems: languages.map((lang) => ({
      label: lang.label,
      value: lang.code,
    })),
  },
]);

const navigationLinks = computed<NavigationLink[]>(() => [
  {
    label: t('landingPage.header.tutorial_link'),
    type: 'anchor',
    href: notionManualLink.value,
  },
  {
    label: t('landingPage.header.pricing_link') || '價格方案',
    type: 'router',
    to: '/pricing-menu',
  },
  {
    label: t('landingPage.header.more_apps_link'),
    type: 'router',
    to: '/more-apps',
  },
]);

// 切換行動版選單開關狀態
// const toggleMobileMenu = () => {
//   showMobileMenu.value = !showMobileMenu.value;
//   // 追蹤選單開關事件
//   trackEvent('menu_toggle', { menu: 'mobile', state: showMobileMenu.value ? 'open' : 'close' });
// };

// 關閉行動版選單
const closeMobileMenu = () => {
  showMobileMenu.value = false;
  emit('mobile-menu-toggle');
  // 追蹤選單關閉事件
  // trackEvent('menu_toggle', { menu: 'mobile', state: 'close' });
};

// 點擊 Header 主要 CTA 按鈕（直接體驗）
// const onHeaderExperienceClick = () => {
//   // 追蹤 CTA 點擊事件
//   trackEvent('cta_click', {
//     section: 'header',
//     cta: 'experience',
//     destination: BRAND_LINK.productionLogin,
//     placement: 'header',
//   });
// };

// 點擊 Header 登入按鈕
const onHeaderLoginClick = () => {
  // 追蹤登入點擊事件
  // trackEvent('login_click', { section: 'header', placement: 'header' });
};
</script>

<style scoped>
/* 確保 header 在背景之上 */
header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 60;
  padding-top: env(safe-area-inset-top);
}

.header-primary-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--brand);
  color: var(--ink);
  font-weight: 700;
  font-size: 14px;
  padding: 10px 20px;
  border-radius: 7px;
  box-shadow: 0 2px 8px rgba(251, 192, 45, 0.35);
  text-decoration: none;
  transition: all 0.15s ease;
}

.header-primary-btn:hover {
  background: var(--brand-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(251, 192, 45, 0.4);
}

.header-primary-btn:focus-visible {
  outline: 2px solid var(--brand);
  outline-offset: 2px;
}
</style>
