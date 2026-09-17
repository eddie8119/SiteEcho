<template>
  <div
    class="group relative rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all hover:border-gray-300 hover:shadow-md"
  >
    <!-- Action Buttons - Top Right -->
    <div
      class="absolute right-2 top-2 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
    >
      <ProjectSettings
        :project-id="project.clientId || project.id"
        :project-title="project.name"
        :is-owner="true"
        class="p-1.5"
      />
      <TextButton
        variant="ghost"
        size="sm"
        :title="t('title.edit_project_name')"
        class="hover:bg-brand-primary/10 p-1.5 hover:text-brand-primary"
        @click="$emit('edit', project)"
      >
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      </TextButton>
      <TrashButton @click="$emit('delete', project)" />
    </div>

    <div class="pr-8">
      <div class="flex-1">
        <!-- View Mode -->
        <div>
          <div class="flex flex-col">
            <h3
              class="text-lg font-semibold text-gray-900 transition-colors group-hover:text-brand-primary"
            >
              {{ project.name }}
            </h3>
            <p v-if="project.isShared && project.ownerName" class="mt-0.5 text-xs text-gray-500">
              {{ t('label.owner') }}: {{ project.ownerName }}
            </p>
            <div class="flex items-center gap-3">
              <div v-if="photoCount !== undefined" class="flex items-center gap-1">
                <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <span class="text-brand-primary">{{ photoCount }} </span
                >{{ t('message.projectManagement.photos') }}
              </div>
              <div
                v-if="trashPhotoCount !== undefined && trashPhotoCount > 0"
                class="flex items-center gap-1"
              >
                <TrashIcon :height="3" :width="3" />
                <span class="text-brand-primary">{{ trashPhotoCount }} </span>
                {{ t('message.projectManagement.photos') }}
              </div>
            </div>
          </div>

          <div class="mt-2 flex flex-wrap items-center justify-between text-xs text-gray-500">
            <div class="flex items-center gap-1">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span
                >{{ t('message.projectManagement.created') }}
                {{ formatDate(project.createdAt) }}</span
              >
            </div>
            <div class="flex items-center gap-1">
              <svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span
                >{{ t('message.projectManagement.lastUsed') }}
                {{ formatDate(project.lastUsedAt) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import type { Project } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import ProjectSettings from '@/components/project/ProjectSettings.vue';
import TrashButton from '@/components/ui/TrashButton.vue';
import TrashIcon from '@/components/ui/TrashIcon.vue';
import { formatDate } from '@/utils/date';

defineProps<{
  project: Project;
  photoCount?: number;
  trashPhotoCount?: number;
}>();

defineEmits<{
  edit: [project: Project];
  delete: [project: Project];
}>();

const { t } = useI18n();
</script>
