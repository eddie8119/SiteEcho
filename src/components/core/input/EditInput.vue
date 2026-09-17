<template>
  <div v-if="!isEditing" class="flex items-center justify-between">
    <span>{{ modelValue }}</span>
    <TextButton variant="primary" size="md" @click="handleEdit">
      {{ t('button.edit') }}
    </TextButton>
  </div>
  <div v-else class="flex items-center gap-2">
    <FormInput
      v-model="editingValue"
      :placeholder="placeholder"
      :name="name"
      :type="type"
      :error="errors?.editingValue"
      @blur="handleBlur"
    />
    <TextButton
      variant="primary"
      :loading="isLoading"
      :disabled="isLoading || !isValid"
      size="md"
      @click="handleSave"
    >
      {{ t('button.save') }}
    </TextButton>

    <TextButton size="md" variant="outline" @click="handleCancel">
      {{ t('button.cancel') }}
    </TextButton>
  </div>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import FormInput from '@/components/core/input/FormInput.vue';
import { useFormValidation } from '@/composables/useFormValidation';
import { createEditingValueSchema } from '@/utils/schemas/editingValueSchema';

interface Props {
  modelValue: string;
  placeholder: string;
  name: string;
  type?: string;
  isLoading?: boolean;
}

interface Emits {
  (e: 'update:modelValue', value: string): void;
  (e: 'save', value: string): Promise<void>;
}

const props = withDefaults(defineProps<Props>(), {
  type: 'text',
  isLoading: false,
});

const emit = defineEmits<Emits>();

const { t } = useI18n();

const isEditing = ref(false);
const lastModelValue = ref(props.modelValue);

const { errors } = useFormValidation(createEditingValueSchema(t), {
  editingValue: props.modelValue,
});

const { value: editingValue, handleBlur } = useField<string>('editingValue');

const isValid = computed(() => {
  return editingValue.value && editingValue.value.trim() && Object.keys(errors.value).length === 0;
});

watch(
  () => props.modelValue,
  (newValue, oldValue) => {
    editingValue.value = newValue;
    if (newValue !== oldValue) {
      isEditing.value = false;
      lastModelValue.value = newValue;
    }
  }
);

const handleEdit = () => {
  isEditing.value = true;
};

const handleCancel = () => {
  isEditing.value = false;
  editingValue.value = props.modelValue;
};

const handleSave = async () => {
  if (!isValid.value) return;

  if (editingValue.value === props.modelValue) {
    isEditing.value = false;
    return;
  }

  // Delegate save to parent (e.g., via vue-query). Do not close or update here.
  // When parent updates modelValue on success, the watcher will close editing.
  emit('save', editingValue.value);
};
</script>

<style lang="scss" scoped></style>
