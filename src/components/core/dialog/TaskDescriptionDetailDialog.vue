<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="t('label.task.task')"
    :show-footer-button="false"
    @cancel="emit('cancel')"
  >
    <div
      class="text-color-difference max-h-72 space-y-3 overflow-auto whitespace-pre-wrap break-words"
    >
      <p>
        {{ description || '-' }}
      </p>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    description: string;
  }>(),
  {
    modelValue: false,
    description: '',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  cancel: [];
}>();

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});
</script>
