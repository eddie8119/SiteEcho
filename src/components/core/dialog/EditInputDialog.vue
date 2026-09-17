<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="title"
    :is-submitting="isSaving"
    :error-message="error"
    :is-invalid="isInvalid"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <ElFormItem :label="label" label-position="top" :error="valueError">
      <ElInput
        v-model="value"
        :placeholder="placeholder"
        :disabled="isSaving"
        @blur="handleBlurValue"
      />
    </ElFormItem>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useField, useForm } from 'vee-validate';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import { textInputSchema, type TextInputSchema } from '@/utils/schemas/textInputSchema';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    initialValue?: string;
    title?: string;
    label?: string;
    placeholder?: string;
  }>(),
  {
    modelValue: false,
    initialValue: '',
    title: '',
    label: '',
    placeholder: '',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  submit: [value: string];
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const { t } = useI18n();

const isSaving = ref(false);
const error = ref('');

const getInitialValues = (): TextInputSchema => ({
  value: props.initialValue,
});

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema: toTypedSchema(textInputSchema(t)),
  initialValues: getInitialValues(),
});

const isInvalid = computed(() => !meta.value.valid);

const { value, handleBlur: handleBlurValue, errorMessage: valueError } = useField('value');

// Reset form when dialog opens/closes or initial value changes
watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetForm({ values: getInitialValues() });
      error.value = '';
    } else {
      resetForm({ values: { value: '' } });
      error.value = '';
    }
  }
);

watch(
  () => props.initialValue,
  (newValue) => {
    if (props.modelValue) {
      resetForm({ values: { value: newValue } });
    }
  }
);

const onSubmit = handleSubmit(async (values: TextInputSchema) => {
  isSaving.value = true;
  error.value = '';

  try {
    emit('submit', values.value);
    resetForm({ values: { value: '' } });
    emit('update:modelValue', false);
  } catch (err) {
    console.error('Failed to submit:', err);
    error.value = t('dialog.edit_project.update_failed');
  } finally {
    isSaving.value = false;
  }
});

const onCancel = () => {
  resetForm({ values: { value: '' } });
  error.value = '';
};
</script>
