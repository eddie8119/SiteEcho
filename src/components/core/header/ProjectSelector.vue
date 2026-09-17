<template>
  <div class="relative">
    <!-- Trigger Button -->
    <button
      ref="buttonRef"
      class="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-900 transition-all hover:border-gray-300 hover:bg-gray-50"
      @click="toggleMenu"
    >
      <svg class="h-5 w-5 text-brand-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
        />
      </svg>
      <span class="max-w-40 overflow-hidden text-ellipsis whitespace-nowrap">
        {{ currentProjectName }}
      </span>
      <svg
        class="h-4 w-4 text-gray-500 transition-transform"
        :class="{ 'rotate-180': showMenu }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Project Menu -->
    <Teleport to="body">
      <div
        v-if="showMenu"
        class="fixed z-[100] mt-2 w-72 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg"
        :style="menuStyle"
      >
        <div class="max-h-80 overflow-y-auto p-2">
          <!-- Loading State -->
          <div v-if="isLoading" class="p-4 text-center text-sm text-gray-500">
            {{ t('project.selector.loading') }}
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="p-4 text-center text-sm text-red-500">
            {{ t('project.selector.load_failed', { error }) }}
          </div>

          <!-- No Projects -->
          <div
            v-else-if="!projects || projects.length === 0"
            class="p-4 text-center text-sm text-gray-500"
          >
            {{ t('project.selector.no_projects') }}
          </div>

          <!-- Projects List -->
          <div v-else>
            <!-- All Projects Option -->
            <div
              class="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
              :class="{
                'border-l-4 border-brand-primary bg-orange-50': !currentProjectId,
              }"
              @click="selectProject(undefined)"
            >
              <div class="flex-1">
                <span class="block text-sm font-medium text-gray-900">{{
                  t('project.selector.all_projects')
                }}</span>
              </div>
              <span v-if="!currentProjectId" class="text-sm text-brand-primary">✓</span>
            </div>
            <!-- Individual Projects -->
            <div
              v-for="project in projects"
              :key="project.id"
              class="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
              :class="{
                'border-l-4 border-brand-primary bg-orange-50':
                  project.clientId === currentProjectId,
              }"
              @click="selectProject(project.clientId)"
            >
              <div class="flex-1">
                <span class="block text-sm font-medium text-gray-900">{{ project.name }}</span>
              </div>
              <span v-if="project.clientId === currentProjectId" class="text-sm text-brand-primary"
                >✓</span
              >
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Overlay -->
    <div
      v-if="showMenu"
      class="fixed bottom-0 left-0 right-0 top-0 z-40"
      @click="showMenu = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import { useProjects } from '@/composables/query/useProjects';

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

const showMenu = ref(false);
const buttonRef = ref<HTMLElement | null>(null);
const menuStyle = ref({ top: '0px', left: '0px' });
const { fetchedProjects: projects, isLoadingProjects: isLoading, error } = useProjects();

const currentProjectId = computed(() => route.query.projectId as string | undefined);

const currentProjectName = computed(() => {
  if (!currentProjectId.value) return t('project.selector.all_projects');
  const project = projects.value?.find((p) => p.clientId === currentProjectId.value);
  return project?.name || t('project.selector.all_projects');
});

const toggleMenu = async () => {
  showMenu.value = !showMenu.value;
  if (showMenu.value && buttonRef.value) {
    await nextTick();
    const rect = buttonRef.value.getBoundingClientRect();
    menuStyle.value = {
      top: `${rect.bottom + 8}px`,
      left: `${rect.right - 288}px`,
    };
  }
};

const selectProject = (projectId: string | undefined) => {
  showMenu.value = false;
  const newQuery = { ...route.query };
  if (projectId) {
    newQuery.projectId = projectId;
  } else {
    delete newQuery.projectId;
  }
  router.push({
    path: route.path,
    query: newQuery,
  });
};
</script>
