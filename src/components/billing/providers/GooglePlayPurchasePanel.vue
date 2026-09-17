<template>
  <div
    v-if="!isAvailable"
    class="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20"
  >
    <div class="flex">
      <svg class="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
        <path
          fill-rule="evenodd"
          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
          clip-rule="evenodd"
        />
      </svg>
      <div class="ml-3">
        <p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">
          {{ t('billing.googlePlay.notYetAvailable') }}
        </p>
        <p class="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
          {{ t('billing.googlePlay.comingSoon') }}
        </p>
      </div>
    </div>
  </div>

  <div v-else class="mt-4 space-y-4">
    <div
      v-if="billingError"
      class="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20"
    >
      <p class="text-sm text-red-800 dark:text-red-200">{{ billingError }}</p>
    </div>

    <div class="grid gap-4 md:grid-cols-2">
      <button
        type="button"
        :disabled="isButtonDisabled"
        class="hover:bg-brand-primary/5 rounded-lg border-2 border-brand-primary bg-white p-4 text-center font-semibold text-brand-primary disabled:opacity-50 dark:bg-gray-800 dark:hover:bg-gray-700"
        @click="purchaseMonthly"
      >
        <span class="block text-sm text-gray-500 dark:text-gray-400">
          {{ t('billing.interval.month') }}
        </span>
        <span class="block text-lg">
          {{
            billingEnabled
              ? monthlyOffer
                ? monthlyOffer.pricingPhases[0]?.formattedPrice
                : '-'
              : 'Google Play 訂閱即將推出'
          }}
        </span>
      </button>

      <button
        type="button"
        :disabled="isButtonDisabled"
        class="hover:bg-brand-primary/90 rounded-lg border-2 border-brand-primary bg-brand-primary p-4 text-center font-semibold text-white disabled:opacity-50"
        @click="purchaseYearly"
      >
        <span class="block text-sm opacity-90">
          {{ t('billing.interval.year') }}
        </span>
        <span class="block text-lg">
          {{
            billingEnabled
              ? yearlyOffer
                ? yearlyOffer.pricingPhases[0]?.formattedPrice
                : '-'
              : 'Google Play 訂閱即將推出'
          }}
        </span>
      </button>
    </div>

    <button
      type="button"
      :disabled="!billingEnabled"
      :class="[
        'text-sm',
        billingEnabled
          ? 'text-gray-500 underline hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
          : 'cursor-not-allowed text-gray-300 no-underline dark:text-gray-600',
      ]"
      @click="billingEnabled && openSubscriptionManagement()"
    >
      {{ t('billing.subscription.manageSubscription') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { useGooglePlayBilling } from '@/composables/billing/useGooglePlayBilling';

const { t } = useI18n();
const {
  isAvailable,
  isLoadingProducts,
  isPurchasing,
  monthlyOffer,
  yearlyOffer,
  billingError,
  purchaseMonthly,
  purchaseYearly,
  openSubscriptionManagement,
} = useGooglePlayBilling();

// Google Play 仍在封閉測試，暫時禁用購買按鈕
const billingEnabled = false;
const isButtonDisabled = !billingEnabled || isLoadingProducts || isPurchasing;
</script>
