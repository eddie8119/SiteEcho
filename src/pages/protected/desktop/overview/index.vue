<template>
  <div class="overview-page h-full overflow-y-auto bg-gray-50 p-6">
    <div class="mx-auto max-w-7xl">
      <H1Title :title="t('overview.title')" class="mb-3" />

      <div class="mb-10">
        <OverviewStats :photos="allPhotos" />
      </div>

      <H2Title :title="t('overview.recentProjects')" class-name="text-xl font-bold" />

      <!-- Project List -->
      <div v-if="isLoadingOverviewProjects" class="flex h-32 items-center justify-center">
        <Loading />
      </div>

      <div
        v-else-if="!fetchedOverviewProjects || fetchedOverviewProjects.length == 0"
        class="rounded-xl border-2 border-dashed border-gray-300 bg-white p-12 text-center"
      >
        <EmptyStatePlaceholder :message="t('overview.noProjectRecords')" />
      </div>

      <div v-else class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        <OverviewProjectCard
          v-for="project in fetchedOverviewProjects"
          :key="project.clientId || project.id"
          :project="project"
          :photo-count="projectPhotoCounts[project.clientId || project.id] || 0"
          :pending-count="projectPendingCounts[project.clientId || project.id] || 0"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated } from 'vue';
import { useI18n } from 'vue-i18n';

import EmptyStatePlaceholder from '@/components/core/EmptyStatePlaceholder.vue';
import Loading from '@/components/core/loading/Loading.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import H2Title from '@/components/core/title/H2Title.vue';
import OverviewProjectCard from '@/components/overview/OverviewProjectCard.vue';
import OverviewStats from '@/components/overview/OverviewStats.vue';
import { usePhotos } from '@/composables/query/usePhoto';
import { useOverviewProjects } from '@/composables/query/useProjects';

const { t } = useI18n();

const { isLoadingOverviewProjects, fetchedOverviewProjects, refetchOverviewProjects } =
  useOverviewProjects();
const { photos: allPhotos, refetchPhotos } = usePhotos();

// Computed photo counts by project
const projectPhotoCounts = computed(() => {
  if (!allPhotos.value) return {};
  const counts: Record<string, number> = {};
  allPhotos.value.forEach((photo) => {
    const projectId = photo.projectId;
    if (projectId) {
      counts[projectId] = (counts[projectId] || 0) + 1;
    }
  });
  return counts;
});

// Computed pending photo counts by project
const projectPendingCounts = computed(() => {
  if (!allPhotos.value) return {};
  const counts: Record<string, number> = {};
  allPhotos.value.forEach((photo) => {
    const projectId = photo.projectId;
    if (projectId && photo.pendingType !== null) {
      counts[projectId] = (counts[projectId] || 0) + 1;
    }
  });
  return counts;
});

// Refetch data when component is activated from KeepAlive cache
onActivated(() => {
  refetchOverviewProjects();
  refetchPhotos();
});
</script>

<style scoped lang="scss">
.overview-page {
  scrollbar-gutter: stable;
}
</style>
