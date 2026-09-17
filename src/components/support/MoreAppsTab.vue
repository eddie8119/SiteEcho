<template>
  <div class="space-y-6">
    <div class="space-y-4 py-6 text-center">
      <h2 class="text-lg font-semibold text-gray-900">
        {{ t('landingPage.moreApps.hero.title') }}
      </h2>
      <p class="text-gray-700">{{ t('landingPage.moreApps.hero.subtitle') }}</p>
    </div>
    <div class="space-y-4">
      <a
        v-for="app in apps"
        :key="app.name"
        :href="app.link"
        target="_blank"
        rel="noopener noreferrer"
        class="block rounded-lg border border-gray-200 p-4 hover:bg-gray-50"
      >
        <div class="flex items-center space-x-4">
          <img :src="app.image" :alt="app.name" class="h-12 w-12 rounded-lg object-contain" />
          <div class="flex-1">
            <h3 class="font-semibold text-gray-900">{{ app.name }}</h3>
            <p class="text-sm text-gray-600">{{ app.description }}</p>
          </div>
          <span class="text-gray-400">→</span>
        </div>
      </a>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { getFunsugarApps } from '@/constants/funsugarApps';

const { t } = useI18n();
const { apps } = getFunsugarApps();
</script>
