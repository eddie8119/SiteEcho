<template>
  <div class="relative">
    <!-- Trigger Button -->
    <button :class="triggerButtonClass" @click="handleMenuToggle">
      <span class="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-base">
        {{ store.currentProjectName || t('project.selector.no_projects') }}
      </span>
      <span
        class="inline-flex h-5 w-5 items-center justify-center text-gray-600 transition-transform"
        :class="{ 'rotate-180': showMenu }"
        aria-hidden="true"
      >
        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.75"
            d="M6 9l6 6 6-6"
          />
        </svg>
      </span>
    </button>

    <!-- Project Menu -->
    <div v-if="showMenu" :class="menuContainerClass">
      <div class="max-h-80 overflow-y-auto">
        <!-- Current Project -->
        <div v-if="store.currentProject" class="border-b border-gray-200 p-2">
          <div
            class="flex items-center justify-between border-l-4 border-brand-primary bg-orange-50 p-3"
          >
            <div class="flex-1">
              <span class="block text-sm font-medium text-gray-900">
                {{ store.currentProject.name }}
                <span
                  v-if="store.currentProject.isShared && store.currentProject.ownerName"
                  class="ml-1 text-xs font-normal text-gray-500"
                >
                  ({{ store.currentProject.ownerName }})
                </span>
              </span>
            </div>
            <span class="text-sm text-brand-primary">✓</span>
          </div>
        </div>

        <!-- Other Projects -->
        <div v-if="otherProjects.length > 0">
          <h4 class="m-0 p-2 px-4 text-xs font-semibold uppercase tracking-widest text-gray-500">
            {{ t('project.other_projects') }}
          </h4>
          <div
            v-for="project in otherProjects"
            :key="project.id"
            class="flex cursor-pointer items-center justify-between p-3 transition-colors hover:bg-gray-50"
            @click="selectProject(project)"
          >
            <div class="flex-1">
              <span class="block text-sm font-medium text-gray-900">
                {{ project.name }}
                <span
                  v-if="project.isShared && project.ownerName"
                  class="ml-1 text-xs font-normal text-gray-500"
                >
                  ({{ project.ownerName }})
                </span>
              </span>
            </div>
          </div>
        </div>

        <!-- Project Management Action -->
        <div class="border-t border-gray-200 p-2">
          <TextButton
            variant="primary"
            size="sm"
            class="w-full justify-start"
            @click="handleManagementAction"
          >
            <svg class="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {{ t('project.manage_projects') }}
          </TextButton>
        </div>

        <!-- Create New Project -->
        <div class="border-t border-gray-200 p-2">
          <TextButton
            variant="primary"
            size="sm"
            class="w-full justify-start"
            @click="handleCreateNewProject"
          >
            <AddIcon class="mr-1" /> {{ t('project.create_project') }}
          </TextButton>
        </div>
      </div>
    </div>

    <!-- Overlay -->
    <div
      v-if="showMenu"
      class="fixed bottom-0 left-0 right-0 top-0 z-40"
      @click="showMenu = false"
    />

    <!-- Create Project Modal -->
    <CreateProjectDialog
      v-model="showCreateModal"
      :force-create="forceCreateProject"
      @project-created="handleProjectCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Project } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import CreateProjectDialog from '@/components/core/dialog/CreateProjectDialog.vue';
import AddIcon from '@/components/ui/AddIcon.vue';
import { projectApi } from '@/api/project';
import { useAuthStore } from '@/stores/useAuthStore';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { SyncStatus } from '@/types/photo';
import {
  deleteProjectFromIndexedDB,
  getProjectsFromIndexedDB,
  saveProjectToIndexedDB,
} from '@/utils/indexedDB';

interface Props {
  triggerButtonClass?: string;
  menuContainerClass?: string;
}

defineProps<Props>();

const emit = defineEmits<{
  'management-action': [];
  'menu-opened': [];
  'menu-closed': [];
}>();

const { t } = useI18n();
const store = useCurrentProject();
const authStore = useAuthStore();

const showMenu = ref(false);
const showCreateModal = ref(false);
const forceCreateProject = ref(false);
const allProjects = ref<Project[]>([]);

const otherProjects = computed(() => {
  if (!store.currentProject) return allProjects.value;
  return allProjects.value.filter((p) => p.id !== store.currentProject?.id);
});

const loadProjects = async () => {
  try {
    if (authStore.isAuthenticated) {
      const response = await projectApi.getProjects();
      const remoteProjects = response.data || [];
      const remoteProjectIds = new Set(
        remoteProjects.flatMap((project) =>
          [project.id, project.clientId].filter((id): id is string => Boolean(id))
        )
      );
      const localProjects = await getProjectsFromIndexedDB();

      // Remove locally cached synced projects that the server no longer returns,
      // such as projects from which this user was removed as a collaborator.
      await Promise.all(
        localProjects
          .filter((project) => project.synced && !remoteProjectIds.has(project.id))
          .map((project) => deleteProjectFromIndexedDB(project.id))
      );

      for (const remote of remoteProjects) {
        const projectId = remote.clientId ?? remote.id;
        const localProject: Project = {
          id: projectId,
          clientId: remote.clientId ?? projectId,
          name: remote.name,
          userId: remote.userId,
          ownerName: remote.ownerName,
          ownerEmail: remote.ownerEmail,
          isShared: remote.isShared,
          createdAt: new Date(remote.createdAt),
          lastUsedAt: new Date(remote.lastUsedAt ?? remote.updatedAt ?? remote.createdAt),
          updatedAt: new Date(remote.updatedAt),
          synced: true,
          syncStatus: SyncStatus.DONE,
          isDeleted: false,
        };
        await saveProjectToIndexedDB(localProject);
      }
    }

    const projects = await getProjectsFromIndexedDB();
    allProjects.value = projects;

    // Refresh current project with latest metadata (e.g. ownerName / isShared)
    if (store.currentProject) {
      const refreshedCurrent = projects.find((p) => p.id === store.currentProject?.id);
      if (refreshedCurrent) {
        store.currentProject = refreshedCurrent;
        localStorage.setItem('currentProject', JSON.stringify(refreshedCurrent));
      }
    }

    if (
      store.currentProject &&
      !projects.some((project) => project.id === store.currentProject?.id)
    ) {
      store.clearCurrentProject();
      await store.initializeCurrentProject();
    }

    if (projects.length === 0) {
      forceCreateProject.value = true;
      showCreateModal.value = true;
    }
  } catch (error) {
    console.error('Failed to load projects:', error);
  }
};

const handleMenuToggle = async () => {
  showMenu.value = !showMenu.value;
  if (showMenu.value) {
    await loadProjects();
  }
};

const selectProject = (project: Project) => {
  store.setCurrentProject(project);
  showMenu.value = false;
};

const handleManagementAction = () => {
  showMenu.value = false;
  emit('management-action');
};

const handleCreateNewProject = () => {
  showMenu.value = false;
  showCreateModal.value = true;
};

const handleProjectCreated = (_project: Project) => {
  showCreateModal.value = false;
  forceCreateProject.value = false;
  loadProjects();
};

onMounted(async () => {
  await store.initializeCurrentProject();
  await loadProjects();
});
</script>
