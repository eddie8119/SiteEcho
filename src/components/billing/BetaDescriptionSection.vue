<template>
  <section class="px-4 py-1 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-3xl">
      <div class="text-color-difference space-y-1 text-center text-sm leading-relaxed sm:text-base">
        <p>{{ t('billing.betaDescription.leading.line1') }}</p>
        <p>{{ t('billing.betaDescription.leading.line2') }}</p>
        <p>{{ t('billing.betaDescription.leading.line3') }}</p>

        <p class="text-base font-semibold sm:text-lg">
          {{ t('billing.betaDescription.benefit.title') }}
        </p>
        <p class="mt-3">{{ t('billing.betaDescription.benefit.lines.line1') }}</p>
        <p>{{ t('billing.betaDescription.benefit.lines.line2') }}</p>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>
