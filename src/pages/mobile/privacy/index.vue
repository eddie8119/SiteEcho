<template>
  <MobilePageLayout :title="t('title.privacy')">
    <div class="space-y-6">
      <H1Title :title="t('title.privacy')" />
      <p class="text-gray-700">{{ t('privacy.intro.welcome') }}</p>
      <p class="text-gray-700">
        {{ t('privacy.intro.intro') }}
      </p>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">
          {{ t('privacy.data_collection.title') }}
        </h2>
        <p class="text-gray-700">{{ t('privacy.data_collection.intro') }}</p>
        <ul class="ml-4 list-disc space-y-2 text-gray-700">
          <li>
            <span class="font-medium">{{ t('privacy.data_collection.account_info') }}</span>
            <ul class="list-circle ml-4 mt-1 space-y-1">
              <li>{{ t('privacy.data_collection.email') }}</li>
              <li>{{ t('privacy.data_collection.google_login') }}</li>
            </ul>
          </li>
          <li>
            <span class="font-medium">{{ t('privacy.data_collection.usage_data') }}</span>
            <ul class="list-circle ml-4 mt-1 space-y-1">
              <li>{{ t('privacy.data_collection.construction_data') }}</li>
            </ul>
          </li>
          <li>
            <span class="font-medium">{{ t('privacy.data_collection.uploaded_content') }}</span>
            <ul class="list-circle ml-4 mt-1 space-y-1">
              <li>{{ t('privacy.data_collection.site_photos') }}</li>
              <li>{{ t('privacy.data_collection.construction_records') }}</li>
              <li>{{ t('privacy.data_collection.issue_tracking') }}</li>
              <li>{{ t('privacy.data_collection.repair_records') }}</li>
            </ul>
          </li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.data_usage.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.data_usage.intro') }}</p>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>{{ t('privacy.data_usage.provide_service') }}</li>
          <li>{{ t('privacy.data_usage.store_sync') }}</li>
          <li>{{ t('privacy.data_usage.create_reports') }}</li>
          <li>{{ t('privacy.data_usage.maintain_security') }}</li>
          <li>{{ t('privacy.data_usage.improve_experience') }}</li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.third_party.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.third_party.intro') }}</p>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>{{ t('privacy.third_party.supabase') }}</li>
          <li>{{ t('privacy.third_party.google_signin') }}</li>
        </ul>
        <p class="text-gray-700">{{ t('privacy.third_party.note') }}</p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.data_retention.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.data_retention.intro') }}</p>
        <p class="text-gray-700">
          {{ t('privacy.data_retention.delete') }}
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.data_security.title') }}</h2>
        <p class="text-gray-700">
          {{ t('privacy.data_security.intro') }}
        </p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.user_rights.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.user_rights.intro') }}</p>
        <ul class="ml-4 list-disc space-y-1 text-gray-700">
          <li>{{ t('privacy.user_rights.query_data') }}</li>
          <li>{{ t('privacy.user_rights.correct_data') }}</li>
          <li>{{ t('privacy.user_rights.delete_account_data') }}</li>
          <li>{{ t('privacy.user_rights.withdraw_consent') }}</li>
        </ul>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.policy_changes.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.policy_changes.intro') }}</p>
        <p class="text-gray-700">{{ t('privacy.policy_changes.note') }}</p>
      </div>

      <div class="space-y-4">
        <h2 class="text-lg font-semibold text-gray-900">{{ t('privacy.contact.title') }}</h2>
        <p class="text-gray-700">{{ t('privacy.contact.intro') }}</p>
        <p class="text-gray-700">
          {{ t('privacy.contact.email_label') }}
          <a :href="`mailto:${BRAND_LINK.email}`" class="text-brand-primary underline">{{
            BRAND_LINK.email
          }}</a>
        </p>
      </div>
    </div>
  </MobilePageLayout>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import H1Title from '@/components/core/title/H1Title.vue';
import MobilePageLayout from '@/layouts/MobilePageLayout.vue';
import { BRAND_LINK } from '@/constants/link';

const { t } = useI18n();
</script>

<style scoped>
ul {
  list-style-type: disc;
}

li {
  list-style-type: inherit;
}

.list-circle {
  list-style-type: circle;
}
</style>
