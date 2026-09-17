<template>
  <div class="background-color-difference flex min-h-screen flex-col items-center justify-center">
    <div class="text-center">
      <h1 class="text-9xl font-bold text-brand-secondary">404</h1>
      <H1Title :title="t('title.page_not_found')" />
      <p class="description-text mt-4">
        {{ t('message.error.page_not_found_description') }}
      </p>
      <div class="mt-6">
        <router-link
          to="/"
          class="rounded-md bg-brand-secondary px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-opacity-50"
        >
          {{ t('link.back_to_home') }}
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import H1Title from '@/components/core/title/H1Title.vue';

const { t } = useI18n();
</script>
