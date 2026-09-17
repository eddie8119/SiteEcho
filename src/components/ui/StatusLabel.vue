<template>
  <div class="flex items-center gap-2">
    <!-- <img :src="showIconUrl" :alt="`${props.status}_icon`" class="w-12" /> -->
    <span class="rounded-full px-2 py-0.5 text-xs font-bold text-white" :class="classLabel">
      {{ t(`label.status.${showIndex}`) }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import { TaskTimeAlertStatus } from '@/types/task';

defineProps<{ showIndex: TaskTimeAlertStatus; classLabel?: string }>();

const { t } = useI18n();
</script>
