<template>
  <div
    class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
    :class="badgeClasses"
  >
    <span class="h-2 w-2 rounded-full" :class="dotClasses" />
    {{ badgeText }}
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useSubscription } from '@/composables/query/useSubscription';
import { SUBSCRIPTION_TYPES } from '@/types/billing';

const { t } = useI18n();
const { subscriptionType } = useSubscription();

const badgeText = computed(() => {
  const type = subscriptionType.value;

  // Type label with fallback when i18n key is missing
  const key = `subscription.${type}`;
  const translated = t(key);
  if (translated === key) {
    const fallbackMap: Record<string, string> = {
      [SUBSCRIPTION_TYPES.DEVELOPER]: 'Developer',
      [SUBSCRIPTION_TYPES.PAID]: 'Paid',
    };
    return fallbackMap[type] ?? String(type);
  }

  return translated;
});

const badgeClasses = computed(() => {
  const type = subscriptionType.value;
  const baseClasses = 'bg-opacity-10';

  switch (type) {
    case SUBSCRIPTION_TYPES.DEVELOPER:
      return `${baseClasses} bg-purple-500 text-purple-700 dark:text-purple-300`;
    case SUBSCRIPTION_TYPES.PAID:
      return `${baseClasses} bg-green-500 text-green-700 dark:text-green-300`;
    default:
      return `${baseClasses} bg-gray-500 text-gray-700 dark:text-gray-300`;
  }
});

const dotClasses = computed(() => {
  const type = subscriptionType.value;

  switch (type) {
    case SUBSCRIPTION_TYPES.DEVELOPER:
      return 'bg-purple-500';
    case SUBSCRIPTION_TYPES.PAID:
      return 'bg-green-500';
    default:
      return 'bg-gray-500';
  }
});
</script>
