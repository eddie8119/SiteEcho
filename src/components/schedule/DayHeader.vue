<template>
  <div
    class="date-header-container z-0"
    :class="headerClass"
    :role="canToggleTimeline ? 'button' : undefined"
    :tabindex="canToggleTimeline ? 0 : undefined"
    @click="handleToggle"
    @keydown.enter.prevent="handleToggle"
    @keydown.space.prevent="handleToggle"
  >
    <div class="flex items-baseline gap-4">
      <h2 class="text-color-difference text-6xl font-bold">
        {{ displayDay }}
      </h2>
      <div class="flex flex-col">
        <span class="font-medium text-secondary-red">{{ group.weekDay }}</span>
        <span class="text200-color-difference text-sm">{{ group.monthYear }}</span>
      </div>
    </div>

    <div
      v-if="canToggleTimeline"
      class="mt-3 flex items-center gap-2 text-sm text-slate-400"
      :aria-label="t('label.switch_view')"
    >
      <span class="text-xs tracking-wide text-slate-400">
        {{ t('label.switch_view') }}
      </span>
      <span class="inline-flex gap-1">
        <span
          v-for="vm in viewModes"
          :key="vm.key"
          :class="[
            'inline-flex h-8 w-8 items-center justify-center rounded-full',
            (vm.key === 'compact' ? !isTimelineMode : isTimelineMode)
              ? 'bg-slate-100 shadow-md dark:bg-black-500'
              : '',
          ]"
          aria-hidden="true"
        >
          <component :is="vm.icon" class="h-4 w-4" />
        </span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Collection, Timer } from '@element-plus/icons-vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { DayGroup as DayGroupType } from '@/utils/scheduleGroupUtils';

const props = defineProps<{
  group: DayGroupType;
  isTimelineMode: boolean;
  canToggleTimeline: boolean;
  mode: 'compact' | 'timeline';
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
}>();

const { t } = useI18n();

const viewModes = [
  { key: 'compact', icon: Collection },
  { key: 'timeline', icon: Timer },
];

const displayDay = computed(() => String(props.group.day).padStart(2, '0'));

const headerClass = computed(() => {
  const base =
    props.mode === 'compact'
      ? 'date-header flex-shrink-0 lg:sticky lg:top-0 lg:mb-4 lg:pb-2'
      : 'timeline-header flex-shrink-0 lg:sticky lg:top-0 lg:mb-4 lg:pb-2';

  const interactive = props.canToggleTimeline
    ? 'cursor-pointer transition-all hover:opacity-75'
    : '';

  return [base, interactive].join(' ');
});

const handleToggle = () => {
  if (!props.canToggleTimeline) return;
  emit('toggle');
};
</script>

<style scoped></style>
