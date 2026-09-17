<template>
  <section class="px-4 py-12 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl space-y-6">
      <H2Title :title="t('billing.betaFeedback.title')" class-name="text-center" />
      <p class="text200-color-difference text-center">
        {{ t('billing.betaFeedback.description') }}
      </p>
      <p class="text200-color-difference text-center">
        {{ t('billing.betaFeedback.description2') }}
      </p>
      <p class="text-primary-600 dark:text-primary-400 text-center font-semibold">
        {{ t('billing.betaFeedback.cta') }}
      </p>
      <div
        class="overflow-hidden rounded-2xl border border-gray-200 shadow-sm dark:border-gray-700"
      >
        <iframe
          class="w-full"
          :src="formUrl"
          frameborder="0"
          marginheight="0"
          marginwidth="0"
          width="640"
          height="1067"
        >
          loading…
        </iframe>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import H2Title from '@/components/core/title/H2Title.vue';

const { t } = useI18n();

const formUrl =
  'https://docs.google.com/forms/d/e/1FAIpQLSd3pPGb4uh-0s41qnHtMt8DlNXeD9kTt5NUA7QjAm__TrINLg/viewform?embedded=true';
</script>
