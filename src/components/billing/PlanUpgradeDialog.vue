<template>
  <div v-if="isOpen" class="bg-black/50 fixed inset-0 z-50 flex items-center justify-center">
    <div
      class="w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-800"
    >
      <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
        {{ t('billing.upgrade.title') }}
      </h3>
      <p class="mt-2 text-sm text-gray-600 dark:text-gray-400">
        {{ t('billing.upgrade.description', { fromPlan: currentPlan, toPlan: selectedPlan }) }}
      </p>

      <!-- Current Period End Info -->
      <div v-if="renewalDate" class="mt-4 rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
        <p class="text-sm text-blue-800 dark:text-blue-300">
          {{ t('billing.renewalDateInfo', { date: formatDate(renewalDate) }) }}
        </p>
      </div>

      <!-- Option 1: Immediate Upgrade -->
      <div class="mt-6 space-y-3">
        <button
          :disabled="isLoading"
          class="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-700 dark:hover:bg-blue-600"
          @click="handleUpgrade(UPGRADE_SUBSCRIPTION_MODES.IMMEDIATE)"
        >
          <span v-if="!isLoading">{{ t('billing.upgrade.immediate') }}</span>
          <span v-else>{{ t('common.loading') }}</span>
        </button>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t('billing.upgrade.immediateDesc') }}
        </p>
      </div>

      <!-- Option 2: Next Renewal -->
      <div class="mt-6 space-y-3">
        <button
          :disabled="isLoading"
          class="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          @click="handleUpgrade(UPGRADE_SUBSCRIPTION_MODES.NEXT_RENEWAL)"
        >
          <span v-if="!isLoading">{{ t('billing.upgrade.nextRenewal') }}</span>
          <span v-else>{{ t('common.loading') }}</span>
        </button>
        <p class="text-xs text-gray-600 dark:text-gray-400">
          {{ t('billing.upgrade.nextRenewalDesc', { date: formatDate(renewalDate) }) }}
        </p>
      </div>

      <!-- Cancel Button -->
      <button
        :disabled="isLoading"
        class="mt-6 w-full rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
        @click="handleClose"
      >
        {{ t('common.cancel') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { UPGRADE_SUBSCRIPTION_MODES, type UpgradeSubscriptionMode } from '@/types/billing';
import { formatDate as formatDateYmd } from '@/utils/date';

interface Props {
  isOpen: boolean;
  currentPlan?: string;
  selectedPlan?: string;
  renewalDate?: Date;
  isLoading?: boolean;
}

interface Emits {
  (e: 'close'): void;
  (e: 'upgrade', mode: UpgradeSubscriptionMode): void;
}

withDefaults(defineProps<Props>(), {
  isLoading: false,
});

const emit = defineEmits<Emits>();
const { t } = useI18n();

const formatDate = (date?: Date) => {
  if (!date) return '';
  return formatDateYmd(date);
};

const handleClose = () => {
  emit('close');
};

const handleUpgrade = (mode: UpgradeSubscriptionMode) => {
  emit('upgrade', mode);
};
</script>
