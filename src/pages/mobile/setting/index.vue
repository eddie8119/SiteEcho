<template>
  <MobilePageLayout :title="t('title.setting')">
    <div class="mb-4">
      <MobileTab
        :model-value="activeTab"
        :tabs="tabs"
        @update:model-value="
          (value: string | number) =>
            (activeTab = value as 'settings' | 'pricing' | 'account' | 'moreApps')
        "
      />
    </div>

    <MobileSettingsTab v-if="activeTab === 'settings'" />
    <MobileAccountTab v-if="activeTab === 'account'" />
    <MobilePricingTab v-if="activeTab === 'pricing'" />
    <MoreAppsTab v-if="activeTab === 'moreApps'" />
  </MobilePageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import MobilePricingTab from '@/components/billing/MobilePricingTab.vue';
import MobileTab from '@/components/core/tab/MobileTab.vue';
import MobileSettingsTab from '@/components/setting/MobileSettingsTab.vue';
import MoreAppsTab from '@/components/support/MoreAppsTab.vue';
import MobileAccountTab from '@/components/user/MobileAccountTab.vue';
import MobilePageLayout from '@/layouts/MobilePageLayout.vue';
import { isAccessTokenValid } from '@/utils/auth';

const { t } = useI18n();

const activeTab = ref<'settings' | 'pricing' | 'account' | 'moreApps'>('settings');

onMounted(() => {
  // Check if navigation came from account-related pages
  const savedTab = sessionStorage.getItem('settingTab');
  if (savedTab === 'account') {
    activeTab.value = 'account';
    sessionStorage.removeItem('settingTab');
  }
});

const tabs = computed(() => {
  const baseTabs = [
    { value: 'settings', label: t('title.setting') },
    { value: 'pricing', label: t('tab.pricing-menu') },
    { value: 'moreApps', label: t('funsugar.tab.more_apps') },
  ];

  // 只有登入時才顯示 account tab，插入到第2個位置
  if (isAccessTokenValid()) {
    baseTabs.splice(1, 0, { value: 'account', label: t('setting.account') });
  }

  return baseTabs;
});
</script>
