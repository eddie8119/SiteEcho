<template>
  <div class="">
    <H3Title :title="$t('report.generationSheet.format')" class-name=" text-gray-500" />
    <div class="flex gap-3">
      <button
        :class="[
          'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
          modelValue === 'pdf'
            ? 'border-orange-500 bg-orange-50 text-orange-600'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
        ]"
        @click="emit('update:modelValue', 'pdf')"
      >
        {{ $t('report.generationSheet.formatPdf') }}
      </button>
      <button
        :class="[
          'flex-1 rounded-lg border-2 px-4 py-3 text-sm font-medium transition-colors',
          modelValue === 'word'
            ? 'border-orange-500 bg-orange-50 text-orange-600'
            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
        ]"
        @click="emit('update:modelValue', 'word')"
      >
        {{ $t('report.generationSheet.formatWord') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import H3Title from '@/components/core/title/H3Title.vue';

defineProps<{
  modelValue: 'pdf' | 'word';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: 'pdf' | 'word'];
}>();

useI18n();
</script>
