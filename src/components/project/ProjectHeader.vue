<template>
  <div
    class="mb-5 flex flex-col gap-4 md:my-5 md:flex-row md:items-center md:justify-between md:gap-0"
  >
    <!-- 更新時間（手機置頂／桌面置右） -->
    <div class="order-1 mb-4 w-full text-right md:order-3 md:mb-0 md:w-auto md:text-left">
      <ShowUpdateTime :last-update-time="lastUpdateTime" />
    </div>
    <!-- 左側群組：標題 + 類型 -->
    <div class="order-3 flex flex-col gap-4 md:order-1 md:flex-1 md:flex-row md:items-center">
      <div class="w-full md:w-auto">
        <ProjectTitle
          :id="projectId"
          :project-title="localProject?.name || undefined"
          @update:project-title="handleUpdateTitle"
        />
      </div>
      <div class="w-full md:w-auto">
        <ProjectType
          :project-type="localProject?.type || undefined"
          @update:project-type="handleUpdateType"
        />
      </div>
    </div>
    <!-- 右側群組：設定 -->
    <div
      class="order-2 flex w-full justify-end md:order-2 md:mr-2 md:w-auto md:items-center md:justify-start"
    >
      <div class="flex items-center gap-1">
        <ProjectSettings :project-title="localProject?.name || undefined" :project-id="projectId" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { UpdateTimeType } from '@/types/common';
import type { ProjectResponse } from '@/types/response';
import type { ProjectType as ProjectTypeValue } from '@/types/selection';

import ShowUpdateTime from '@/components/core/ShowUpdateTime.vue';
import ProjectSettings from '@/components/project/ProjectSettings.vue';
import ProjectTitle from '@/components/project/ProjectTitle.vue';
import ProjectType from '@/components/project/ProjectType.vue';

defineProps<{
  localProject: ProjectResponse | null;
  projectId: string;
  lastUpdateTime: UpdateTimeType;
}>();

const emit = defineEmits<{
  (e: 'update:project-title', value: string): void;
  (e: 'update:project-type', value: ProjectTypeValue): void;
}>();

const handleUpdateTitle = (value: string) => {
  emit('update:project-title', value);
};

const handleUpdateType = (value: ProjectTypeValue) => {
  emit('update:project-type', value);
};
</script>

<style scoped></style>
