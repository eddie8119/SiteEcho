<template>
  <div :class="bannerClasses" role="alert">
    <h4 v-if="title" class="text-sm font-semibold">{{ title }}</h4>
    <div v-if="hasDefaultSlot" class="mt-1 text-sm font-medium opacity-80">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';

import { ALERT_BANNER_VARIANT, type AlertBannerVariant } from '@/types/ui';

interface Props {
  variant?: AlertBannerVariant;
  dense?: boolean;
  fullWidth?: boolean;
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  variant: ALERT_BANNER_VARIANT.INFO,
  dense: false,
  fullWidth: false,
  title: undefined,
});

const slots = useSlots();
const hasDefaultSlot = computed(() => Boolean(slots.default));

const bannerClasses = computed(() => {
  const baseStyles =
    'rounded-lg border px-4 py-4 text-sm font-medium transition-colors duration-200';

  const variantStyles: Record<AlertBannerVariant, string> = {
    [ALERT_BANNER_VARIANT.SUCCESS]:
      'border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-900/20 dark:text-green-200',
    [ALERT_BANNER_VARIANT.WARNING]:
      'border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-900/20 dark:text-yellow-200',
    [ALERT_BANNER_VARIANT.INFO]:
      'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-200',
    [ALERT_BANNER_VARIANT.ERROR]:
      'border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200',
  };

  return [
    baseStyles,
    variantStyles[props.variant],
    props.dense ? 'py-3' : '',
    props.fullWidth ? 'w-full' : '',
  ]
    .filter(Boolean)
    .join(' ');
});
</script>
