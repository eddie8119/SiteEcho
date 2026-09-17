<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="title"
    :show-footer-button="true"
    :is-invalid="!itemName.trim()"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <ElFormItem :label="typeLabel">
      <ElInput
        v-model="itemName"
        :placeholder="t('dialog.option_dialog.name_placeholder', { type: typeLabel })"
        @keyup.enter="onSubmit"
      />
    </ElFormItem>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';

const props = defineProps<{
  modelValue: boolean;
  type: 'construction' | 'space';
}>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [name: string];
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
const title = computed(() => t('dialog.option_dialog.add_title', { type: typeLabel.value }));

const itemName = ref('');

watch(
  () => props.modelValue,
  (visible) => {
    if (visible) {
      itemName.value = '';
    }
  }
);

const onSubmit = () => {
  if (itemName.value.trim()) {
    emit('submit', itemName.value.trim());
    dialogVisible.value = false;
  }
};

const onCancel = () => {
  emit('cancel');
  dialogVisible.value = false;
};
</script>
