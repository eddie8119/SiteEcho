<template>
  <!-- StoreKit Error Banner -->
  <div v-if="iapError" class="mt-4">
    <AlertBanner :variant="ALERT_BANNER_VARIANT.ERROR">
      <div class="flex items-center justify-between">
        <span>{{ iapError }}</span>
        <button
          v-if="!isLoadingProducts"
          class="ml-4 rounded bg-white px-3 py-1 text-sm font-semibold text-gray-900 hover:bg-gray-100 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          @click="loadStoreKitProducts"
        >
          {{ t('common.retry') }}
        </button>
      </div>
    </AlertBanner>
  </div>

  <!-- Restore Purchases Link -->
  <a
    href="#"
    class="hover:text-gray-700 dark:hover:text-gray-300"
    @click.prevent="handleRestorePurchases"
  >
    {{ t('billing.subscription.restorePurchases') }}
  </a>

  <!-- Auto-renewal Notice -->
  <div class="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
    {{ t('billing.subscription.autoRenewalNotice') }}
  </div>

  <!-- Terms of Use -->
  <a
    href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
    target="_blank"
    rel="noopener noreferrer"
    class="hover:text-gray-700 dark:hover:text-gray-300"
  >
    {{ t('billing.subscription.termsOfUse') }}
  </a>

  <!-- Toast Notification -->
  <Toast
    v-if="toastMessage"
    :message="toastMessage"
    :variant="toastVariant"
    @close="toastMessage = null"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import AlertBanner from '@/components/core/AlertBanner.vue';
import Toast from '@/components/core/Toast.vue';
import { useAppleIAP } from '@/composables/billing/useAppleIAP';
import { useUserSubscription } from '@/composables/query/useBilling';
import { ALERT_BANNER_VARIANT } from '@/types/ui';

const { t } = useI18n();
const appleIAP = useAppleIAP();
const { isLoadingProducts, iapError, loadStoreKitProducts, restorePurchases } = appleIAP;
const { refetchSubscription } = useUserSubscription({ enabled: true });

const loadingPlanId = ref<string | null>(null);
const toastMessage = ref<string | null>(null);
const toastVariant = ref<'success' | 'error' | 'info'>('info');

const handleRestorePurchases = async () => {
  loadingPlanId.value = 'restore';
  const res = await restorePurchases();
  loadingPlanId.value = null;

  if (res.success) {
    if (res.message) {
      toastMessage.value = res.message;
    } else {
      toastMessage.value = t('billing.subscription.restored');
    }
    toastVariant.value = 'success';
    await refetchSubscription();
  } else if (res.error) {
    toastMessage.value = res.error;
    toastVariant.value = 'error';
  }
};
</script>
