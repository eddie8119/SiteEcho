<template>
  <div class="z-9999 fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center p-5">
    <div class="bg-black/80 absolute bottom-0 left-0 right-0 top-0 backdrop-blur-sm" />
    <div class="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
      <div class="text-center">
        <h2 class="mb-2 text-2xl font-bold text-gray-900">
          {{ t('project.firstTimeSetup.title') }}
        </h2>
        <p class="mb-8 text-base text-gray-600">{{ t('project.firstTimeSetup.subtitle') }}</p>

        <form class="text-left" @submit.prevent="handleCreateProject">
          <div class="mb-6">
            <LabelText :title="t('project.firstTimeSetup.projectNameLabel')" />
            <input
              id="projectName"
              v-model="projectName"
              type="text"
              class="w-full rounded-lg border-2 border-gray-200 px-4 py-3 text-base transition-colors focus:border-blue-500 focus:outline-none disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
              :placeholder="t('project.firstTimeSetup.projectNamePlaceholder')"
              required
              :disabled="isCreating"
            />
          </div>

          <div class="text-center">
            <TextButton
              type="submit"
              variant="primary"
              size="lg"
              :loading="isCreating"
              :disabled="!projectName.trim()"
              class="min-w-32"
            >
              {{
                isCreating
                  ? t('project.firstTimeSetup.creating')
                  : t('project.firstTimeSetup.create')
              }}
            </TextButton>
          </div>
        </form>

        <div
          v-if="error"
          class="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700"
        >
          {{ error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { v4 as uuidv4 } from 'uuid';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Project } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import LabelText from '@/components/core/input/LabelText.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { saveProjectToIndexedDB } from '@/utils/indexedDB';

const emit = defineEmits<{
  'project-created': [project: Project];
}>();

const { setCurrentProject } = useCurrentProject();
const { t } = useI18n();

const projectName = ref('');
const isCreating = ref(false);
const error = ref('');

const handleCreateProject = async () => {
  if (!projectName.value.trim()) return;

  isCreating.value = true;
  error.value = '';

  try {
    // Create new project locally
    const now = new Date();
    const newProject: Project = {
      id: uuidv4(),
      name: projectName.value.trim(),
      createdAt: now,
      lastUsedAt: now,
      updatedAt: now,
    };

    // Save to IndexedDB
    await saveProjectToIndexedDB(newProject);

    // Set as current project immediately
    setCurrentProject(newProject);

    // Emit to parent component
    emit('project-created', newProject);
  } catch (err) {
    console.error('Failed to create project:', err);
    error.value = t('project.firstTimeSetup.createFailed');
  } finally {
    isCreating.value = false;
  }
};
</script>
