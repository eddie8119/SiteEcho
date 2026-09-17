<template>
  <div class="project-management-page">
    <MobileHeader :title="t('tab.projects')" />

    <!-- Content -->
    <div class="mx-auto max-w-4xl p-4 pb-20">
      <!-- Loading State -->
      <Loading v-if="isLoading" />

      <!-- Empty State -->
      <div
        v-else-if="projects.length === 0"
        class="flex flex-col items-center justify-center"
        style="height: calc(100vh - 140px)"
      >
        <div class="text-center">
          <svg
            class="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
          <h3 class="mt-2 text-sm font-medium text-gray-900">
            {{ t('message.projectManagement.noProjects') }}
          </h3>
          <p class="mt-1 text-sm font-medium text-brand-primary">
            {{ t('message.projectManagement.startFirstProject') }}
          </p>
          <div class="mt-6">
            <TextButton variant="primary" size="sm" @click="showCreateModal = true">
              {{ t('button.create_project_simple') }}
            </TextButton>
          </div>
        </div>
      </div>

      <!-- Projects List -->
      <div v-else class="space-y-3">
        <div class="flex justify-end">
          <TextButton variant="primary" size="sm" @click="showCreateModal = true">
            {{ t('button.create_project_simple') }}
          </TextButton>
        </div>
        <ProjectCard
          v-for="project in projects"
          :key="project.id"
          :project="project"
          :photo-count="projectPhotoCounts[project.id]"
          :trash-photo-count="projectTrashPhotoCounts[project.id]"
          @edit="startEdit"
          @delete="confirmDelete"
        />
      </div>
    </div>

    <!-- Create Project Modal -->
    <CreateProjectDialog v-model="showCreateModal" @project-created="handleProjectCreated" />

    <!-- Edit Project Name Dialog -->
    <EditInputDialog
      v-model="showEditDialog"
      :initial-value="projectToEdit?.name || ''"
      :title="t('dialog.edit_project.title')"
      :label="t('dialog.edit_project.project_name')"
      :placeholder="t('dialog.edit_project.placeholder')"
      @submit="handleProjectNameSubmit"
    />

    <!-- Delete Confirmation Modal -->
    <DeleteDialog
      v-model="showDeleteModal"
      :target="projectToDelete?.name || ''"
      subject=""
      @confirm="deleteProject"
    >
      <template #body>
        <div class="flex flex-col gap-2 text-center text-sm">
          <p class="mb-2 text-red-600">
            {{
              t('message.projectManagement.confirmDeleteProject', { name: projectToDelete?.name })
            }}
          </p>
        </div>
      </template>
    </DeleteDialog>

    <!-- Photos Exist Warning Modal -->
    <DeleteDialog
      v-model="showPhotosExistModal"
      :target="projectToDelete?.name || ''"
      subject=""
      :show-footer-button="false"
      @confirm="
        () => {
          showPhotosExistModal = false;
        }
      "
    >
      <template #body>
        <div class="flex flex-col gap-2 text-center text-sm">
          <p class="font-medium text-red-600">
            {{ t('message.projectManagement.clearPhotosWarning') }}
          </p>
          <p v-if="projectPhotoCounts[projectToDelete?.id || 0] > 0" class="text-gray-500">
            {{
              t('message.projectManagement.projectHasPhotos', {
                name: projectToDelete?.name,
                count: projectPhotoCounts[projectToDelete?.id || 0],
              })
            }}
          </p>
          <p v-if="projectTrashPhotoCounts[projectToDelete?.id || 0] > 0" class="text-gray-500">
            {{
              t('message.projectManagement.projectHasTrashPhotos', {
                name: projectToDelete?.name,
                count: projectTrashPhotoCounts[projectToDelete?.id || 0],
              })
            }}
          </p>
        </div>
      </template>
    </DeleteDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { Project } from '@/types/photo';

import { projectApi } from '@/api/project';
import TextButton from '@/components/core/button/TextButton.vue';
import CreateProjectDialog from '@/components/core/dialog/CreateProjectDialog.vue';
import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import EditInputDialog from '@/components/core/dialog/EditInputDialog.vue';
import MobileHeader from '@/components/core/header/MobileHeader.vue';
import Loading from '@/components/core/loading/Loading.vue';
import ProjectCard from '@/components/project/ProjectCard.vue';
import { useCurrentProjectStore } from '@/composables/useCurrentProject';
import { useAuthStore } from '@/stores/useAuthStore';
import { SyncStatus } from '@/types/photo';
import {
  deleteProjectAndPhotosFromIndexedDB,
  getPhotosByProjectFromIndexedDB,
  getProjectsFromIndexedDB,
  getTrashPhotosByProjectFromIndexedDB,
  saveProjectToIndexedDB,
  updateProjectInIndexedDB,
} from '@/utils/indexedDB';
import { logError } from '@/utils/logger';

const store = useCurrentProjectStore();
const authStore = useAuthStore();
const { t } = useI18n();

const projects = ref<Project[]>([]);
const isLoading = ref(true);
const showCreateModal = ref(false);
const showDeleteModal = ref(false);
const showPhotosExistModal = ref(false);
const projectToDelete = ref<Project | null>(null);
const projectPhotoCounts = ref<Record<string, number>>({});
const projectTrashPhotoCounts = ref<Record<string, number>>({});

// Edit dialog
const showEditDialog = ref(false);
const projectToEdit = ref<Project | null>(null);

const loadProjects = async () => {
  try {
    isLoading.value = true;
    const allProjects = await getProjectsFromIndexedDB();
    projects.value = allProjects
      .filter((p) => !p.isDeleted)
      .sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());

    // Load photo counts for each project
    for (const project of projects.value) {
      try {
        const photos = await getPhotosByProjectFromIndexedDB(project.id);
        projectPhotoCounts.value[project.id] = photos.length;
      } catch (error) {
        logError(`Failed to load photos for project ${project.id}:`, error, 'ProjectManagement');
        projectPhotoCounts.value[project.id] = 0;
      }
    }

    // Load trash photo counts for each project
    for (const project of projects.value) {
      try {
        const trashPhotos = await getTrashPhotosByProjectFromIndexedDB(project.id);
        projectTrashPhotoCounts.value[project.id] = trashPhotos.length;
      } catch (error) {
        logError(
          `Failed to load trash photos for project ${project.id}:`,
          error,
          'ProjectManagement'
        );
        projectTrashPhotoCounts.value[project.id] = 0;
      }
    }
  } catch (error) {
    logError('Failed to load projects:', error, 'ProjectManagement');
  } finally {
    isLoading.value = false;
  }
};

const startEdit = (project: Project) => {
  projectToEdit.value = project;
  showEditDialog.value = true;
};

const handleProjectNameSubmit = async (newName: string) => {
  if (!projectToEdit.value) return;

  try {
    const now = new Date();
    const updatedProject: Project = {
      ...projectToEdit.value,
      name: newName,
      lastUsedAt: now,
      updatedAt: now,
    };

    if (authStore.isAuthenticated) {
      // Online: sync to server immediately
      await projectApi.sync([
        {
          clientId: updatedProject.id,
          name: updatedProject.name,
          createdAt: updatedProject.createdAt.toISOString(),
          lastUsedAt: updatedProject.lastUsedAt.toISOString(),
          updatedAt: updatedProject.updatedAt.toISOString(),
          groupReportNotes: updatedProject.groupReportNotes
            ? (updatedProject.groupReportNotes as Record<string, unknown>)
            : null,
        },
      ]);
    } else {
      // Offline: mark as pending so syncProjects picks it up on next login
      updatedProject.synced = false;
      updatedProject.syncStatus = SyncStatus.PENDING;
    }

    await saveProjectToIndexedDB(updatedProject);

    const index = projects.value.findIndex((p) => p.id === updatedProject.id);
    if (index !== -1) {
      projects.value[index] = updatedProject;
    }

    // Update current project if it's the one being edited
    if (store.currentProject?.id === updatedProject.id) {
      store.setCurrentProject(updatedProject);
    }
  } catch (error) {
    logError('Failed to update project name:', error, 'ProjectManagement');
  }
};

const confirmDelete = (project: Project) => {
  projectToDelete.value = project;
  // Check if project has photos or trash photos
  if (projectPhotoCounts.value[project.id] > 0 || projectTrashPhotoCounts.value[project.id] > 0) {
    showPhotosExistModal.value = true;
  } else {
    showDeleteModal.value = true;
  }
};

const deleteProject = async () => {
  if (!projectToDelete.value) return;

  try {
    // 先檢查是否為當前專案
    const isCurrentProject = store.currentProject?.id === projectToDelete.value.id;

    if (authStore.isAuthenticated) {
      // Online: delete from server first, then hard-delete locally
      await projectApi.deleteBatch([projectToDelete.value.id]);
      await deleteProjectAndPhotosFromIndexedDB(projectToDelete.value.id);
    } else {
      // Offline: soft-delete so syncProjects can reconcile with server on next login.
      // Preserve the current `synced` value so sync knows whether this project
      // ever reached the server (synced=true → needs server deletion on login).
      await updateProjectInIndexedDB(projectToDelete.value.id, {
        isDeleted: true,
        syncStatus: SyncStatus.PENDING,
      });
    }

    // Remove from local state
    projects.value = projects.value.filter((p) => p.id !== projectToDelete.value?.id);
    if (projectToDelete.value) {
      delete projectPhotoCounts.value[projectToDelete.value.id];
    }

    // 如果刪除的是當前專案，先清除 store
    if (isCurrentProject) {
      store.clearCurrentProject();
    }

    // 重新初始化 store 以確保反映當前的 IndexedDB 狀態
    await store.initializeCurrentProject();

    projectToDelete.value = null;
    showDeleteModal.value = false;
  } catch (error) {
    logError('Failed to delete project:', error, 'ProjectManagement');
  }
};

const handleProjectCreated = (_project: Project) => {
  showCreateModal.value = false;
  loadProjects(); // Reload to get updated list
};

onMounted(() => {
  loadProjects();
});
</script>
