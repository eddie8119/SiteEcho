<template>
  <div v-if="showBanner" class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <AlertBanner :variant="bannerVariant">
      <div class="flex items-center justify-between">
        <span>{{ bannerMessage }}</span>
        <button
          v-if="showDismiss"
          class="ml-4 text-sm font-medium underline hover:no-underline"
          @click="dismissBanner"
        >
          {{ t('common.dismiss') }}
        </button>
      </div>
    </AlertBanner>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AlertBanner from '@/components/core/AlertBanner.vue';
import { ALERT_BANNER_VARIANT } from '@/types/ui';

const { t } = useI18n();

const dismissed = ref(false);

const getGoLiveDate = (): Date | null => {
  // This would ideally come from the API, but for now we'll use a computed value
  // In production, you might want to fetch this from /api/subscription/info
  const goLiveDateStr = '2026-07-01';
  if (!goLiveDateStr) return null;
  const d = new Date(goLiveDateStr);
  return isNaN(d.getTime()) ? null : d;
};

const goLiveDate = computed(() => getGoLiveDate());

const showBanner = computed(() => {
  if (dismissed.value) return false;
  if (!goLiveDate.value) return false;

  return false;
});

const bannerVariant = computed(() => {
  return ALERT_BANNER_VARIANT.INFO;
});

const bannerMessage = computed(() => {
  if (!goLiveDate.value) return '';

  return '';
});

const showDismiss = computed(() => {
  return false;
});

const dismissBanner = () => {
  dismissed.value = true;
  // Optionally persist to localStorage
  localStorage.setItem('goLiveBannerDismissed', 'true');
};

// Check if banner was previously dismissed
if (localStorage.getItem('goLiveBannerDismissed') === 'true') {
  dismissed.value = true;
}
</script>
