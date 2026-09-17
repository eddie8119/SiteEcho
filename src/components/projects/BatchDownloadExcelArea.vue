<template>
  <template v-if="hasProjects">
    <TextButton
      type="button"
      variant="secondary"
      size="sm"
      class="px-2 sm:w-auto"
      @click="showBatchDownloadDialog = true"
      ><img src="@/assets/icons/Download.png" alt="Download" class="mr-1 h-4 w-4" />
      {{ t('button.batch_download') }}
    </TextButton>

    <BatchDownloadDialog v-model="showBatchDownloadDialog" :projects="projects" :tasks="tasks" />
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ProjectResponse, TaskResponse } from '@/types/response';

import TextButton from '@/components/core/button/TextButton.vue';
import BatchDownloadDialog from '@/components/core/dialog/BatchDownloadDialog.vue';

const props = defineProps<{
  projects: ProjectResponse[] | undefined;
  tasks: TaskResponse[] | undefined;
}>();

const { t } = useI18n();
const showBatchDownloadDialog = ref(false);
const hasProjects = computed(() => (props.projects?.length ?? 0) > 0);
</script>

<style scoped></style>
