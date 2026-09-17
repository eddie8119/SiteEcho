<template>
  <div class="flex items-center gap-2 md:gap-3">
    <ShowNowTime />
    <HeaderNavActions :nav-items="navItems" />
    <!-- <SubscriptionBadge v-if="authStore.isAuthenticated" /> -->
    <MobileNav />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import HeaderNavActions from './HeaderNavActions.vue';
import MobileNav from './MobileNav.vue';
import ShowNowTime from './ShowNowTime.vue';

import type { NavItem } from '@/types/layout';

// import SubscriptionBadge from '@/components/subscription/SubscriptionBadge.vue';
import { useAuthentication } from '@/composables/useAuthentication';
import { useLocale } from '@/composables/useLocale';
import { useAuthStore } from '@/stores/useAuthStore';
import { Language } from '@/types/language';

const { t } = useI18n();
const authStore = useAuthStore();
const { languages, handleLanguageChange } = useLocale();
const { authentications, handleAuthenticationChange } = useAuthentication();

// const toggleTheme = inject('toggleTheme') as () => void;

// 為了解決 型別切換
const handleLanguageSelect = (code: string): void => {
  handleLanguageChange(code as Language);
};

const navItems = computed<NavItem[]>(() => {
  const baseItems: NavItem[] = [
    // {
    //   id: 0,
    //   name: 'LightSet',
    //   icon: 'LightSet',
    //   label: t('common.light_set'),
    //   action: toggleTheme,
    // },
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
  ];
  if (authStore.isAuthenticated) {
    baseItems.push(
      // {
      //   id: 2,
      //   name: 'Notification',
      //   icon: 'Bell',
      //   label: t('common.notification'),
      //   action: () => {},
      // },

      {
        id: 2,
        name: 'Authentication',
        icon: 'UserCircle',
        label: t('common.authentication'),
        action: handleAuthenticationChange,
        dropdownItems: authentications.map((auth) => ({
          label: t(`dropdown.${auth.label}`),
          value: auth.code,
        })),
      }
    );
  }

  return baseItems;
});
</script>

<style lang="scss" scoped></style>
