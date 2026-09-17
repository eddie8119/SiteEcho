<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="t('dialog.create_project.title')"
    :is-submitting="isCreating"
    :error-message="error"
    :is-invalid="isInvalid"
    :close-on-click-modal="!forceCreate"
    :close-on-press-escape="!forceCreate"
    @submit="onSubmit"
    @cancel="onCancel"
  >
    <div v-if="forceCreate" class="mb-4 text-center text-base text-gray-600 text-secondary-red">
      {{ t('dialog.create_project.no_project_warning') }}
    </div>
    <ElFormItem
      :label="t('dialog.create_project.project_name')"
      label-position="top"
      :error="nameError"
    >
      <ElInput
        v-model="name"
        :placeholder="t('dialog.create_project.placeholder')"
        :disabled="isCreating"
        @blur="handleBlurName"
      />
    </ElFormItem>
    <template v-if="forceCreate" #footer>
      <TextButton
        variant="primary"
        :disabled="isCreating || isInvalid"
        :loading="isCreating"
        size="md"
        @click="onSubmit"
      >
        {{ t('button.submit') }}
      </TextButton>
    </template>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { useField, useForm } from 'vee-validate';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Project } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { saveProjectToIndexedDB } from '@/utils/indexedDB';
import { createProjectSchema, type CreateProjectSchema } from '@/utils/schemas/createProjectSchema';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    forceCreate?: boolean;
  }>(),
  {
    forceCreate: false,
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'project-created': [project: Project];
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => {
    if (props.forceCreate && !value) {
      return;
    }
    emit('update:modelValue', value);
  },
});

const { setCurrentProject } = useCurrentProject();
const { t } = useI18n();

const isCreating = ref(false);
const error = ref('');

const getInitialValues = (): CreateProjectSchema => ({
  name: '',
});

const { handleSubmit, meta, resetForm } = useForm({
  validationSchema: toTypedSchema(createProjectSchema(t)),
  initialValues: getInitialValues(),
});

const isInvalid = computed(() => !meta.value.valid);

const { value: name, handleBlur: handleBlurName, errorMessage: nameError } = useField('name');

const onSubmit = handleSubmit(async (values: CreateProjectSchema) => {
  isCreating.value = true;
  error.value = '';

  try {
    const now = new Date();
    const newProject: Project = {
      id: crypto.randomUUID(),
      name: values.name,
      createdAt: now,
      lastUsedAt: now,
      updatedAt: now,
    };

    await saveProjectToIndexedDB(newProject);
    setCurrentProject(newProject);

    emit('project-created', newProject);
    resetForm({ values: getInitialValues() });
    emit('update:modelValue', false);
  } catch (err) {
    console.error('Failed to create project:', err);
    error.value = t('dialog.create_project.create_failed');
  } finally {
    isCreating.value = false;
  }
});

const onCancel = () => {
  resetForm({ values: getInitialValues() });
  error.value = '';
};
</script>
