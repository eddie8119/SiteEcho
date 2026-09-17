<template>
  <!-- Billing Status Alert -->
  <!-- <div v-if="!isBillingEnabled">
    <div
      class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-900 dark:bg-yellow-900/20"
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
            {{ t('billing.disabled') }}
          </p>
        </div>
      </div>
    </div>
  </div> -->

  <!-- Current Plan Banner -->
  <div v-if="currentPlanMessage && !isLandingPage" class="mt-4">
    <AlertBanner :variant="ALERT_BANNER_VARIANT.INFO">
      {{ currentPlanMessage }}
    </AlertBanner>
  </div>

  <!-- Warning Banner (e.g., 409 already subscribed) -->
  <div v-if="warningMessage && !isLandingPage" class="mt-4">
    <AlertBanner :variant="ALERT_BANNER_VARIANT.WARNING">
      {{ warningMessage }}
    </AlertBanner>
  </div>

  <!-- StoreKit Error Banner (Apple only) -->
  <div v-if="iapError && isAppleIAPAvailable && !isLandingPage" class="mt-4">
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

  <!-- Provider-specific panels -->
  <AppleIapPurchasePanel v-if="provider === 'apple' && !isLandingPage" />
  <GooglePlayPurchasePanel v-else-if="provider === 'google' && !isLandingPage" />
  <WebPurchasePanel v-else-if="provider === 'web' && !isLandingPage" />

  <!-- Pricing Cards -->
  <div class="mt-4">
    <div class="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
      <PricingMenuCard
        v-for="plan in pricingPlans"
        :key="plan.id"
        :plan="plan"
        :loading="loadingPlanId === plan.id && !plan.contactSales"
        :is-current-plan="isCurrentPlan(plan.id)"
        :is-landing-page="isLandingPage"
        :is-store-kit-ready="isStoreKitReady"
        @select="handleSelectPlan"
        @contact="handleContactSales"
      />
    </div>
  </div>

  <!-- Plan Upgrade Dialog -->
  <PlanUpgradeDialog
    :is-open="showUpgradeDialog"
    :current-plan="subscription?.plan"
    :selected-plan="selectedPlanId ?? undefined"
    :renewal-date="renewalDate"
    :is-loading="isUpgrading"
    @close="showUpgradeDialog = false"
    @upgrade="handleUpgradeSubscriptionMode"
  />

  <!-- Toast Notification -->
  <Toast
    v-if="toastMessage"
    :message="toastMessage"
    :variant="toastVariant"
    @close="toastMessage = null"
  />

  <!-- Footer Links -->
  <div
    v-if="!isLandingPage"
    class="mt-8 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-500 dark:text-gray-400"
  >
    <a
      :href="`${BRAND_LINK.production}privacy`"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-gray-700 dark:hover:text-gray-300"
    >
      {{ t('billing.subscription.privacyPolicy') }}
    </a>
    <a
      v-if="provider === 'apple'"
      href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"
      target="_blank"
      rel="noopener noreferrer"
      class="hover:text-gray-700 dark:hover:text-gray-300"
    >
      {{ t('billing.subscription.termsOfUse') }}
    </a>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import PlanUpgradeDialog from '@/components/billing/PlanUpgradeDialog.vue';
import PricingMenuCard from '@/components/billing/PricingMenuCard.vue';
import AppleIapPurchasePanel from '@/components/billing/providers/AppleIapPurchasePanel.vue';
import GooglePlayPurchasePanel from '@/components/billing/providers/GooglePlayPurchasePanel.vue';
import WebPurchasePanel from '@/components/billing/providers/WebPurchasePanel.vue';
import AlertBanner from '@/components/core/AlertBanner.vue';
import Toast from '@/components/core/Toast.vue';
import { useCurrentSubscription } from '@/composables/billing/useCurrentSubscription';
import { usePlanCheckout } from '@/composables/billing/usePlanCheckout';
import { usePlanFeedback } from '@/composables/billing/usePlanFeedback';
import { usePlanPricing } from '@/composables/billing/usePlanPricing';
import { usePlanUpgrade } from '@/composables/billing/usePlanUpgrade';
import { BRAND_LINK } from '@/constants/link';
import { ALERT_BANNER_VARIANT } from '@/types/ui';

const { t } = useI18n();

const feedback = usePlanFeedback();
const pricing = usePlanPricing();
const currentSubscription = useCurrentSubscription();
const planUpgrade = usePlanUpgrade({ feedback, currentSubscription });
const planCheckout = usePlanCheckout({
  feedback,
  pricing,
  currentSubscription,
  upgrade: planUpgrade,
});

const {
  provider,
  isLandingPage,
  isAppleIAPAvailable,
  iapError,
  isLoadingProducts,
  loadStoreKitProducts,
  pricingPlans,
  isStoreKitReady,
} = pricing;

const { currentPlanMessage, isCurrentPlan, subscription, renewalDate } = currentSubscription;

const { loadingPlanId, warningMessage, toastMessage, toastVariant } = feedback;

const { showUpgradeDialog, selectedPlanId, isUpgrading, handleUpgradeSubscriptionMode } =
  planUpgrade;

const { handleSelectPlan, handleContactSales } = planCheckout;
</script>
