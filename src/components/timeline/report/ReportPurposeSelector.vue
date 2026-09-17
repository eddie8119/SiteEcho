<template>
  <div class="grid grid-cols-1 gap-2">
    <button
      v-for="p in purposes"
      :key="p.id"
      class="flex items-start gap-3 rounded-xl border p-4 text-left transition-colors"
      :class="
        modelValue === p.id
          ? 'border-orange-500 bg-orange-50'
          : 'border-gray-200 bg-white hover:border-orange-300'
      "
      @click="emit('update:modelValue', p.id)"
    >
      <div
        class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
        :class="
          modelValue === p.id ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'
        "
      >
        <div v-if="modelValue === p.id" class="h-2 w-2 rounded-full bg-white" />
      </div>
      <div class="space-y-0.5">
        <div
          class="text-sm font-medium"
          :class="modelValue === p.id ? 'text-orange-700' : 'text-gray-700'"
        >
          {{ p.label }}
        </div>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { Purpose } from '@/types/report';

defineProps<{
  modelValue: Purpose | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: Purpose];
}>();

const { t } = useI18n();

const purposes = computed(() => [
  { id: Purpose.Internal, label: t('report.purposeSelector.internal') },
  {
    id: Purpose.Billing,
    label: t('report.purposeSelector.billing'),
  },
  {
    id: Purpose.FollowUp,
    label: t('report.purposeSelector.followUp'),
  },
]);
</script>
