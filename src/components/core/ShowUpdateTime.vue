<template>
  <p class="text200-color-difference text-right text-sm">
    {{ t('common.last_update_time') }}: {{ formattedTime }}
  </p>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { UpdateTimeType } from '@/types/common';

const props = defineProps<{ lastUpdateTime: UpdateTimeType }>();
const { t } = useI18n();
const formatTime = (value: UpdateTimeType): string => {
  if (!value) return '-';

  const date = new Date(value);
  return date.toLocaleString();
};

const formattedTime = computed(() => formatTime(props.lastUpdateTime));
</script>
