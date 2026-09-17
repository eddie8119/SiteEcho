<template>
  <div class="min-h-screen">
    <!-- Content -->
    <div class="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <!-- Checkout Result Banners -->
      <AlertBanner v-if="checkoutBanner" class="mb-6" :variant="checkoutBanner.variant">
        {{ checkoutBanner.message }}
      </AlertBanner>

      <div v-if="isLoading">
        <Loading />
      </div>

      <!-- No Subscription -->
      <div v-else-if="!subscription" class="subscription-card-panel">
        <div class="text-center">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 class="mt-4 text-lg font-medium text-gray-900 dark:text-white">
            {{ t('billing.subscription.noActiveSubscription') }}
          </h3>
          <p class="mt-2 text-gray-600 dark:text-gray-400">
            {{ t('billing.subscription.noActiveSubscriptionDesc') }}
          </p>
          <RouterLink
            :to="{ name: 'pricing-menu' }"
            class="mt-6 inline-block rounded-lg bg-blue-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-600"
          >
            {{ t('billing.subscription.browsePlans') }}
          </RouterLink>
        </div>
      </div>

      <!-- Active Subscription -->
      <div v-else class="space-y-6">
        <!-- Subscription Card -->
        <div class="subscription-card-panel">
          <div class="flex items-start justify-between">
            <div class="flex items-center gap-3">
              <h2 class="text-2xl font-bold text-gray-900 dark:text-white">
                {{ formattedPlanName }}
              </h2>
              <SubscriptionBadge />
            </div>
            <span
              :class="[
                'inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium',
                subscription.status === 'active'
                  ? 'border-green-500 text-green-600 dark:border-green-400 dark:text-green-400'
                  : 'border-red-500 text-red-600 dark:border-red-400 dark:text-red-400',
              ]"
            >
              {{ t(`billing.status.${subscription.status}`) }}
            </span>
          </div>

          <!-- Period Info -->
          <div class="mt-8 grid grid-cols-2 gap-6">
            <div v-for="info in periodInfo" :key="info.key">
              <p class="text-sm text-gray-600 dark:text-gray-400">
                {{ t(info.labelKey) }}
              </p>
              <p class="mt-1 text-lg font-semibold text-gray-900 dark:text-white">
                {{ info.value }}
              </p>
            </div>
          </div>

          <!-- Cancellation Info -->
          <AlertBanner
            v-if="subscription.cancelAtPeriodEnd && subscription.currentPeriodEnd"
            class="mt-6"
            :variant="ALERT_BANNER_VARIANT.WARNING"
            :title="t('billing.subscriptionEndingSoon')"
          >
            <p class="mt-1 text-sm">
              {{
                t('billing.cancelledAtPeriodEnd', {
                  date: formatDate(subscription.currentPeriodEnd),
                })
              }}
            </p>
          </AlertBanner>
        </div>

        <!-- Actions -->
        <div class="flex gap-4">
          <button
            v-for="button in actionButtons"
            :key="button.key"
            :class="button.class"
            @click="button.handler"
          >
            {{ t(button.labelKey) }}
          </button>
        </div>

        <!-- Billing History -->
        <div
          class="rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800"
        >
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('billing.billing.billingHistory') }}
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ t('billing.billing.billingHistoryDesc') }}
          </p>
          <TextButton
            class="mt-4"
            variant="secondary"
            size="md"
            type="button"
            @click="handleViewBillingHistory"
          >
            {{ t('billing.billing.viewInvoices') }}
          </TextButton>
        </div>

        <!-- Plan Upgrades CTA -->
        <div class="subscription-card-panel text-center">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('billing.general.pricing') }}
          </h3>
          <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {{ t('billing.general.pricingDescription') }}
          </p>
          <TextButton
            class="mt-4"
            variant="secondary"
            size="md"
            type="button"
            @click="handleViewPricingMenu"
          >
            {{ t('billing.viewAllPlans') }}
          </TextButton>
        </div>

        <!-- Cancel Dialog -->
        <DeleteDialog
          v-model="showCancelDialog"
          :subject="t('title.billing_subscription')"
          :target="formattedPlanName"
          :body-text="t('common.warning')"
          @confirm="handleCancelSubscription"
        >
          <template #body>
            <p class="leading-relaxed">
              {{ t('billing.billing.cancelSubscription') }}
              <span class="text-base font-semibold text-secondary-red">
                {{ subscription?.plan }}
              </span>
              ?
              <span class="block">
                {{ t('billing.subscription.confirmCancel') }}
              </span>
            </p>
          </template>
        </DeleteDialog>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AlertBanner from '@/components/core/AlertBanner.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import Loading from '@/components/core/loading/Loading.vue';
import SubscriptionBadge from '@/components/subscription/SubscriptionBadge.vue';
import { useUserSubscription } from '@/composables/query/useBilling';
import { ALERT_BANNER_VARIANT, type AlertBannerVariant } from '@/types/ui';
import { formatDate as formatDateYmd } from '@/utils/date';
import { logError } from '@/utils/logger';
import { formatPlanDisplayName } from '@/utils/planDisplay';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const {
  subscription,
  isLoadingSubscription,
  refetchSubscription,
  cancelUserSubscription,
  resumeUserSubscription,
  createSubscriptionCustomerPortalSession,
} = useUserSubscription();
const isLoading = isLoadingSubscription;
const successFromCheckout = ref(false);
const cancelFromCheckout = ref(false);
const showCancelDialog = ref(false);

const checkoutBannerConfig: Record<
  'success' | 'canceled',
  { variant: AlertBannerVariant; message: string }
> = {
  success: {
    variant: ALERT_BANNER_VARIANT.SUCCESS,
    message: 'Payment successful. Your subscription has been updated.',
  },
  canceled: {
    variant: ALERT_BANNER_VARIANT.WARNING,
    message: 'Payment canceled. No changes were made to your subscription.',
  },
};

const checkoutBanner = computed<{ variant: AlertBannerVariant; message: string } | null>(() => {
  if (successFromCheckout.value) {
    return checkoutBannerConfig.success;
  }

  if (cancelFromCheckout.value) {
    return checkoutBannerConfig.canceled;
  }

  return null;
});
const formatDate = (dateString: string) => {
  return formatDateYmd(new Date(dateString));
};

const formattedPlanName = computed(
  () => formatPlanDisplayName(subscription.value?.plan, t) || subscription.value?.plan || ''
);

const periodInfo = computed(() => {
  if (!subscription.value) {
    return [];
  }

  const info = [];
  if (subscription.value.currentPeriodStart) {
    info.push({
      key: 'currentPeriodStart',
      labelKey: 'billing.currentPeriodStart',
      value: formatDate(subscription.value.currentPeriodStart),
    });
  }
  if (subscription.value.currentPeriodEnd) {
    info.push({
      key: 'currentPeriodEnd',
      labelKey: 'billing.currentPeriodEnd',
      value: formatDate(subscription.value.currentPeriodEnd),
    });
  }
  return info;
});

onMounted(async () => {
  try {
    const from = route.query.from as string | undefined;
    if (from === 'checkout_success') {
      successFromCheckout.value = true;
      await refetchSubscription();
    } else if (from === 'checkout_canceled') {
      cancelFromCheckout.value = true;
    }
  } catch (error) {
    logError('Failed to load subscription:', error, 'Subscription');
  }
});

const handleManagePayment = async () => {
  try {
    const result = await createSubscriptionCustomerPortalSession();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  } catch (error) {
    logError('Failed to create customer portal session:', error, 'Subscription');
  }
};

const handleCancelSubscription = async () => {
  try {
    await cancelUserSubscription();
    await refetchSubscription();
  } catch (error) {
    logError('Failed to cancel subscription:', error, 'Subscription');
  } finally {
    showCancelDialog.value = false;
  }
};

const handleResumeSubscription = async () => {
  try {
    await resumeUserSubscription();
    await refetchSubscription();
  } catch (error) {
    logError('Failed to resume subscription:', error, 'Subscription');
  }
};

const handleViewBillingHistory = async () => {
  try {
    const result = await createSubscriptionCustomerPortalSession();
    if (result.data?.url) {
      window.location.href = result.data.url;
    }
  } catch (error) {
    logError('Failed to open customer portal:', error, 'Subscription');
  }
};

const handleViewPricingMenu = () => {
  router.push({ name: 'pricing-menu' });
};

const actionButtons = computed(() => {
  const sub = subscription.value;

  const buttons = [
    {
      key: 'manage',
      class:
        'flex-1 rounded-lg border border-gray-300 bg-white px-6 py-3 font-semibold text-gray-900 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600',
      labelKey: 'billing.managePayment',
      handler: handleManagePayment,
    },
  ];

  if (!sub) {
    return buttons;
  }

  if (!sub.cancelAtPeriodEnd) {
    buttons.push({
      key: 'cancel',
      class:
        'flex-1 rounded-lg border border-red-300 bg-white px-6 py-3 font-semibold text-red-600 transition-colors hover:bg-red-50 dark:border-red-600 dark:bg-gray-700 dark:text-red-400 dark:hover:bg-gray-600',
      labelKey: 'billing.cancelSubscription',
      handler: async () => {
        showCancelDialog.value = true;
      },
    });
  } else {
    buttons.push({
      key: 'resume',
      class:
        'flex-1 rounded-lg border border-green-300 bg-white px-6 py-3 font-semibold text-green-600 transition-colors hover:bg-green-50 dark:border-green-600 dark:bg-gray-700 dark:text-green-400 dark:hover:bg-gray-600',
      labelKey: 'billing.resumeSubscription',
      handler: handleResumeSubscription,
    });
  }

  return buttons;
});
</script>

<style scoped lang="scss">
@mixin subscription-card-panel-base {
  @apply rounded-lg border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-800;
}

.subscription-card-panel {
  @include subscription-card-panel-base;
}
</style>
