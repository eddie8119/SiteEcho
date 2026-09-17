<template>
  <div class="flex flex-col items-center justify-center py-12 text-center">
    <p class="mb-4 text-gray-600">{{ t('timeline.empty_state.no_matching_photos') }}</p>
    <button
      v-if="showClearButton"
      class="rounded-lg bg-blue-500 px-4 py-2 text-sm text-white hover:bg-blue-600"
      @click="emit('clear-filters')"
    >
      {{ t('timeline.empty_state.clear_filters') }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

defineProps<{
  showClearButton: boolean;
}>();

const emit = defineEmits<{
  'clear-filters': [];
}>();

const { t } = useI18n();
</script>
