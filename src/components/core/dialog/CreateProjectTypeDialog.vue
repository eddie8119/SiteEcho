<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="t('title.create_project')"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <ElFormItem :label="t('label.project.project_type')">
      <ElSelect v-model="type" :placeholder="t('placeholder.project.project_type')">
        <ElOption
          v-for="item in PROJECT_TYPES"
          :key="item.value"
          :label="t(`option.projectType.${item.value}`)"
          :value="item.value"
        />
      </ElSelect>
    </ElFormItem>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import { useDialogReset } from '@/composables/useDialogReset';
import { PROJECT_TYPES, type ProjectType } from '@/constants/selection';

const props = defineProps<{
  modelValue: boolean;
}>();
const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:projectType': [type: string];
}>();

const { t } = useI18n();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const type = ref<ProjectType>('residential');

const onSubmit = () => {
  emit('update:projectType', type.value);
  onCancel();
};

const resetDialogState = () => {
  type.value = 'residential';
};

const { createCancelHandler } = useDialogReset(() => props.modelValue, resetDialogState);
const onCancel = createCancelHandler(() => emit('update:modelValue', false));
</script>
