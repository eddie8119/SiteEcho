<template>
  <div
    class="relative flex flex-col rounded-2xl bg-white p-6 shadow-sm dark:bg-gray-800"
    :class="plan.borderClass"
  >
    <!-- Billing Toggle (only for Pro plan) - absolute positioned top right -->
    <div v-if="plan.annualPrice" class="absolute right-6 top-6">
      <div class="relative inline-flex items-center rounded-lg bg-gray-100 p-1 dark:bg-gray-700">
        <button
          class="relative rounded-md px-3 py-1.5 text-sm font-medium transition-all"
          :class="
            !isAnnual
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          "
          @click="isAnnual = false"
        >
          {{ t('billing.billing.interval.month') }}
        </button>
        <button
          class="relative rounded-md px-3 py-1.5 text-sm font-medium transition-all"
          :class="
            isAnnual
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
              : 'text-gray-600 dark:text-gray-400'
          "
          @click="isAnnual = true"
        >
          {{ t('billing.billing.interval.year') }}
          <span
            class="ml-1 rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700 dark:bg-green-900 dark:text-green-300"
          >
            -{{ plan.annualSavings }}%
          </span>
        </button>
      </div>
    </div>

    <div class="mb-6 flex items-center justify-between">
      <h3 class="text-2xl font-extrabold" :class="plan.titleClass">{{ plan.title }}</h3>
      <span
        v-if="plan.badgeText"
        class="bg-brand-primary/10 rounded-full px-2.5 py-1 text-xs font-bold text-brand-primary"
      >
        {{ plan.badgeText }}
      </span>
    </div>

    <div class="mb-6 flex flex-wrap items-center gap-3">
      <div class="flex items-end gap-2">
        <span class="text-4xl font-black text-gray-900 dark:text-white">
          {{ displayPriceLabel }}
        </span>
        <span class="mb-1 text-sm text-gray-500 dark:text-gray-400">/ {{ displayInterval }}</span>
      </div>
      <div
        v-if="isAnnual && plan.annualPrice && !plan.nativeAnnualPriceLabel"
        class="mt-2 text-sm text-gray-600 dark:text-gray-400"
      >
        <div class="text-xs text-gray-500 dark:text-gray-500">
          {{
            t('billing.pricingCard.averageMonthly', {
              currency: plan.currencySymbol,
              price: plan.annualMonthlyPrice,
            })
          }}
        </div>
      </div>
    </div>
    <button
      v-if="!shouldHideFreeButton"
      class="mb-2 rounded-lg px-4 py-3 font-semibold text-white transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
      :class="[plan.buttonClass, isButtonDisabled ? 'opacity-60' : '']"
      :aria-busy="!plan.contactSales && loading"
      :aria-label="getButtonLabel"
      :aria-disabled="isButtonDisabled"
      :disabled="isButtonDisabled"
      :style="isButtonDisabled ? { cursor: 'not-allowed' } : undefined"
      :title="isButtonDisabled ? currentPlanNote : undefined"
      @click="onClick"
    >
      <span>
        {{ getButtonText }}
      </span>
    </button>
    <p
      v-if="!isCurrentPlan && plan.price !== '0' && plan.hasFreeTrial"
      class="mb-4 text-center text-xs font-medium text-green-600 dark:text-green-400"
    >
      {{ trialMessage }}
    </p>
    <p v-if="isCurrentPlan" class="mb-2 text-center text-xs text-gray-500 dark:text-gray-400">
      {{ currentPlanNote }}
    </p>

    <ul class="space-y-3 text-sm text-gray-800 dark:text-gray-200">
      <li v-for="feature in plan.features" :key="feature" class="flex items-start">
        <span class="mr-2" :class="plan.checkClass" aria-hidden="true">✔</span>
        <span>{{ feature }}</span>
      </li>
    </ul>
    <p v-if="plan.note" class="mt-4 text-xs text-gray-500 dark:text-gray-400">{{ plan.note }}</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { PricingMenuPlan } from '@/types/billing';

import { useDeviceDetection } from '@/composables/useDeviceDetection';
import { isAccessTokenValid } from '@/utils/auth';

interface Props {
  plan: PricingMenuPlan;
  loading: boolean;
  isCurrentPlan?: boolean;
  isLandingPage?: boolean;
  isStoreKitReady?: boolean;
}

type SelectPayload = {
  planId: string;
  billingInterval: 'month' | 'year';
  productId?: string;
};

const props = defineProps<Props>();
const emit = defineEmits<{
  select: [payload: SelectPayload];
  contact: [];
}>();

const { t } = useI18n();

const isAnnual = ref(false);
const { isMobile } = useDeviceDetection();
const shouldHideFreeButton = computed(() => props.plan.id === 'free' && isMobile.value);

const formatFallbackPrice = (price: string) => `${props.plan.currencySymbol} ${price}`;

const resolvePeriodLabel = (period?: {
  value: number;
  unit: 'day' | 'week' | 'month' | 'year';
}) => {
  if (!period) return null;

  if (period.value === 1) {
    if (period.unit === 'month') return t('billing.billing.interval.month');
    if (period.unit === 'year') return t('billing.billing.interval.year');
    if (period.unit === 'week') return 'week';
    return 'day';
  }

  return `${period.value} ${period.unit}`;
};

const displayPriceLabel = computed(() => {
  // Free plan always shows 0, regardless of platform
  if (props.plan.price === '0') {
    return formatFallbackPrice(props.plan.price);
  }

  const nativeLabel = isAnnual.value
    ? props.plan.nativeAnnualPriceLabel
    : props.plan.nativePriceLabel;

  if (props.plan.platform === 'app_iap') {
    return nativeLabel ?? t('billing.subscription.priceUnavailable');
  }

  return isAnnual.value
    ? formatFallbackPrice(props.plan.annualPrice ?? props.plan.price)
    : formatFallbackPrice(props.plan.price);
});

const displayInterval = computed(() => {
  const period = isAnnual.value ? props.plan.nativeAnnualPricePeriod : props.plan.nativePricePeriod;
  return (
    resolvePeriodLabel(period) ??
    (isAnnual.value ? t('billing.billing.interval.year') : t('billing.billing.interval.month'))
  );
});

const isButtonDisabled = computed(
  () =>
    !props.plan.contactSales &&
    !props.isLandingPage &&
    (props.loading ||
      props.isCurrentPlan ||
      (props.plan.platform === 'app_iap' && props.isStoreKitReady === false))
);

const getButtonText = computed(() => {
  if (props.isCurrentPlan) {
    return t('billing.subscription.currentPlan');
  }
  if (props.plan.contactSales) {
    return props.plan.buttonText;
  }
  if (props.loading) {
    return t('billing.subscription.processing');
  }
  return props.plan.buttonText;
});

const getButtonLabel = computed(() => {
  if (props.isCurrentPlan) {
    return t('billing.subscription.currentPlan');
  }
  return props.loading ? t('billing.subscription.processing') : props.plan.buttonText;
});

const currentPlanNote = computed(() => t('billing.subscription.currentPlanNote'));

const trialMessage = computed(() => {
  const nativeLabel = isAnnual.value
    ? props.plan.nativeAnnualPriceLabel
    : props.plan.nativePriceLabel;

  let priceLabel: string;
  if (props.plan.platform === 'app_iap') {
    priceLabel = nativeLabel ?? t('billing.subscription.priceUnavailable');
  } else {
    priceLabel = isAnnual.value
      ? formatFallbackPrice(props.plan.annualPrice ?? props.plan.price)
      : formatFallbackPrice(props.plan.price);
  }

  const interval = isAnnual.value
    ? t('billing.billing.interval.year')
    : t('billing.billing.interval.month');
  return t('billing.pricingCard.trialPeriod', {
    currency: '',
    price: priceLabel,
    interval,
  });
});

const onClick = () => {
  if (props.plan.contactSales) {
    emit('contact');
    return;
  }
  if (isButtonDisabled.value) {
    return;
  }
  // For unauthenticated users on landing page, redirect to login with intent params
  if (props.isLandingPage && !isAccessTokenValid()) {
    const planId = props.plan.id;
    const interval = isAnnual.value ? 'year' : 'month';
    const redirectUrl = encodeURIComponent(
      `/pricing-menu?plan=${planId}&interval=${interval}&autoCheckout=true`
    );
    window.location.href = `/auth/login?redirect=${redirectUrl}`;
    return;
  }

  emit('select', {
    planId: props.plan.id,
    billingInterval: isAnnual.value ? 'year' : 'month',
    productId: isAnnual.value ? props.plan.productIdYearly : props.plan.productIdMonthly,
  });
};
</script>
