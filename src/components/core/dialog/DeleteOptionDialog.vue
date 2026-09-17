<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="t('dialog.delete_option_dialog.title')"
    :show-footer-button="true"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <p class="mb-4 text-base text-gray-600">
      {{ t('dialog.delete_option_dialog.message', { name: item?.name, type: typeLabel }) }}
    </p>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { OptionItem } from '@/types/photo';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';

const props = defineProps<{
  modelValue: boolean;
  type: 'construction' | 'space';
  item: OptionItem | null;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [id: string];
  cancel: [];
}>();

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const typeLabel = computed(() =>
  props.type === 'construction'
    ? t('dialog.option_dialog.construction')
    : t('dialog.option_dialog.space')
);

const onSubmit = () => {
  if (props.item) {
    emit('confirm', props.item.id);
    dialogVisible.value = false;
  }
};

const onCancel = () => {
  emit('cancel');
  dialogVisible.value = false;
};
</script>
