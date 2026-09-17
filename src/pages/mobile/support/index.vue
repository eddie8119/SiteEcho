<template>
  <MobileHeader :title="t('title.support')" />
  <div class="mobile-page-container">
    <div class="space-y-6">
      <H1Title :title="t('support.need_help')" />

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('support.faq_title') }}</h2>
        <p class="text-gray-700">{{ t('support.faq_description') }}</p>
        <a
          :href="notionManualLink"
          target="_blank"
          rel="noopener noreferrer"
          class="support-button"
        >
          {{ t('setting.user_manual') }}
        </a>
      </div>

      <hr class="my-6 border-gray-200" />

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('support.privacy_title') }}</h2>
        <router-link to="/privacy" class="support-button">
          {{ t('title.privacy') }}
        </router-link>
      </div>

      <hr class="my-6 border-gray-200" />

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('support.contact_title') }}</h2>

        <div class="flex flex-col space-y-2">
          <a :href="`mailto:${BRAND_LINK.email}`" class="support-button">
            {{ t('support.email_label') }}: {{ BRAND_LINK.email }}
          </a>
          <a
            :href="BRAND_LINK.instagramSiteNear"
            target="_blank"
            rel="noopener noreferrer"
            class="support-button"
          >
            Instagram
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import MobileHeader from '@/components/core/header/MobileHeader.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import { useLocaleLink } from '@/composables/useLocaleLink';
import { BRAND_LINK } from '@/constants/link';

const { t } = useI18n();
const { notionManualLink } = useLocaleLink();
</script>

<style scoped>
.support-button {
  @apply inline-block w-full rounded border border-gray-300 px-4 py-2 text-center text-sm hover:bg-gray-50;
}
</style>
