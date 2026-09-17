<template>
  <div
    class="storage-usage p-4 text-base"
    :class="[isSidebarCollapsed ? 'px-2' : 'px-4', $attrs.class]"
  >
    <div v-if="!isSidebarCollapsed && !isCompact" class="mb-2 flex justify-between font-medium">
      <span class="text-gray-700">{{ t('billing.storageUsage.cloudUsage') }}</span>
      <span class="text-gray-900"
        >{{ formattedUsed }} / {{ formattedLimit
        }}{{ !isLoggedIn ? t('billing.storageUsage.notLoggedIn') : '' }}</span
      >
    </div>

    <div
      class="relative w-full overflow-hidden rounded-full bg-gray-200"
      :class="[isSidebarCollapsed ? 'h-1.5' : 'h-2', isCompact ? 'h-1' : '']"
    >
      <div
        class="h-full transition-all duration-300"
        :class="progressColor"
        :style="{
          width: usagePercentage > 0 && usagePercentage < 1 ? '1%' : `${usagePercentage}%`,
        }"
      />
    </div>

    <div v-if="!isSidebarCollapsed && !isCompact" class="mt-2 text-sm text-gray-500">
      {{ t('billing.storageUsage.photoCount', { count: limits.photoCount }) }}
    </div>

    <div
      v-if="isOverStorageLimit && !isSidebarCollapsed"
      class="mt-2 rounded-md bg-amber-50 p-2 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
    >
      <span>已達雲端容量上限，請升級 Pro 以恢復自動同步備份。</span>
      <router-link
        to="/billing/pricing"
        class="ml-1 font-semibold text-amber-900 underline dark:text-amber-200"
      >
        升級方案
      </router-link>
    </div>

    <div v-if="isCompact" class="mt-1 flex flex-col gap-0.5 text-xs text-gray-500">
      <div class="flex justify-between">
        <span>{{ t('billing.storageUsage.cloudUsage') }}</span>
        <span
          >{{ formattedUsed }} / {{ formattedLimit
          }}{{ !isLoggedIn ? t('billing.storageUsage.notLoggedIn') : '' }}</span
        >
      </div>
      <div class="text-right italic">
        {{ t('billing.storageUsage.photoCount', { count: limits.photoCount }) }}
      </div>
    </div>

    <div v-if="isSidebarCollapsed" class="mt-1 text-center text-xs font-bold text-gray-600">
      {{ usagePercentage }}%
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSubscription } from '@/composables/query/useSubscription';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatStorage } from '@/utils/storage';

withDefaults(defineProps<Props>(), {
  isSidebarCollapsed: false,
  isCompact: false,
});

defineOptions({
  inheritAttrs: false,
});

interface Props {
  isSidebarCollapsed?: boolean;
  isCompact?: boolean;
}

const { limits } = useSubscription();
const authStore = useAuthStore();
const { t } = useI18n();

const isLoggedIn = computed(() => authStore.isAuthenticated);

const isOverStorageLimit = computed(() => {
  if (!limits.value.storageLimitBytes) return false;
  return limits.value.usedStorageBytes >= limits.value.storageLimitBytes;
});

const usagePercentage = computed(() => {
  if (!limits.value.storageLimitBytes) return 0;
  const percentage = (limits.value.usedStorageBytes / limits.value.storageLimitBytes) * 100;
  // Show more decimal places for very small percentages
  const decimalPlaces = percentage < 1 ? 3 : 1;
  return Math.min(parseFloat(percentage.toFixed(decimalPlaces)), 100);
});

const progressColor = computed(() => {
  if (usagePercentage.value > 90) return 'bg-red-500';
  if (usagePercentage.value > 70) return 'bg-yellow-500';
  return 'bg-orange-500';
});

const formattedUsed = computed(() => formatStorage(limits.value.usedStorageBytes));
const formattedLimit = computed(() => formatStorage(limits.value.storageLimitBytes));
</script>

<style scoped>
.storage-usage {
  width: 100%;
}
</style>
