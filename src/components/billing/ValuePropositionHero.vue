<template>
  <SimpleHeroSection
    :title="t('billing.valueProposition.title')"
    :subtitle="t('billing.valueProposition.subtitle')"
  />
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import SimpleHeroSection from '@/components/landing/mvpSection/SimpleHeroSection.vue';

const { t } = useI18n();
</script>
