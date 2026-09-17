<template>
  <div
    class="flex flex-col rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
  >
    <div class="p-6">
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-lg font-bold text-gray-900">{{ project.name }}</h3>
        <div class="flex shrink-0 items-center gap-2">
          <ProjectSettings
            :project-id="project.id"
            :project-title="project.name"
            :is-owner="isOwner"
          />
          <span class="text-sm text-gray-500">{{ updatedAtText }}</span>
        </div>
      </div>

      <div class="mt-6 space-y-3">
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">📸 {{ t('overview.projectCard.totalPhotos') }}</span>
          <span class="font-semibold text-gray-900">{{ photoCount }}</span>
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-gray-600">⚠ {{ t('overview.projectCard.pending') }}</span>
          <span class="font-semibold text-brand-primary">{{ pendingCount }}</span>
        </div>
      </div>
    </div>

    <div class="mt-auto border-t border-gray-100 p-4">
      <router-link
        :to="'/desktop/photos?projectId=' + projectId"
        class="hover:bg-brand-primary/90 flex w-full items-center justify-center rounded-lg bg-brand-primary px-4 py-2.5 text-sm font-bold text-white transition-colors"
      >
        {{ t('overview.projectCard.enterProject') }}
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ProjectResponse } from '@/types/response';

import ProjectSettings from '@/components/project/ProjectSettings.vue';
import { formatDate } from '@/utils/date';
import { getCurrentUserId } from '@/utils/user';

interface Props {
  project: ProjectResponse;
  photoCount: number;
  pendingCount: number;
}

const props = defineProps<Props>();
const { t } = useI18n();
const currentUserId = getCurrentUserId();

const projectId = computed(() => props.project.clientId || props.project.id);
const isOwner = computed(() => currentUserId === props.project.userId);
const updatedAtText = computed(() =>
  t('overview.projectCard.updatedAt', {
    date: formatDate(new Date(props.project.updatedAt)),
  })
);
</script>
