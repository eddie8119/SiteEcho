import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

import type { Project } from '@/types/photo';

import { getProjectsFromIndexedDB } from '@/utils/indexedDB';

// Store for managing current project state
export const useCurrentProjectStore = defineStore('currentProject', () => {
  const currentProject = ref<Project | null>(null);
  const isFirstTimeUser = ref(false);

  // Computed properties
  const hasCurrentProject = computed(() => currentProject.value !== null);
  const currentProjectId = computed(() => currentProject.value?.id || null);
  const currentProjectName = computed(() => {
    const name = currentProject.value?.name || '';
    return name;
  });

  // Actions
  const setCurrentProject = (project: Project) => {
    currentProject.value = project;
    // Update last used timestamp
    project.lastUsedAt = new Date();
    // Save to localStorage for persistence
    localStorage.setItem('currentProjectId', project.id);
    localStorage.setItem('currentProject', JSON.stringify(project));
  };

  const clearCurrentProject = () => {
    currentProject.value = null;
    localStorage.removeItem('currentProjectId');
    localStorage.removeItem('currentProject');
  };

  const loadCurrentProjectFromStorage = () => {
    const storedProject = localStorage.getItem('currentProject');
    if (storedProject) {
      try {
        const project = JSON.parse(storedProject);
        // Convert date strings back to Date objects
        project.createdAt = new Date(project.createdAt);
        project.lastUsedAt = new Date(project.lastUsedAt);
        currentProject.value = project;
      } catch (error) {
        console.error('Failed to parse stored project:', error);
        clearCurrentProject();
      }
    }
  };

  const checkFirstTimeUser = async () => {
    try {
      const projects = await getProjectsFromIndexedDB();
      isFirstTimeUser.value = projects.length === 0;
      return isFirstTimeUser.value;
    } catch (error) {
      console.error('Failed to check user projects:', error);
      return false;
    }
  };

  const initializeCurrentProject = async () => {
    // First check if we have a stored current project
    loadCurrentProjectFromStorage();

    if (hasCurrentProject.value) {
      // Verify that the stored project still exists in IndexedDB
      try {
        const projects = await getProjectsFromIndexedDB();
        const projectExists = projects.some((p) => p.id === currentProject.value?.id);

        if (!projectExists) {
          // Project no longer exists in IndexedDB, clear it
          clearCurrentProject();
        } else {
          return currentProject.value;
        }
      } catch (error) {
        console.error('Failed to verify project existence:', error);
        // If we can't verify, clear the project to be safe
        clearCurrentProject();
      }
    }

    // If no current project, check if user has any projects in IndexedDB
    try {
      const projects = await getProjectsFromIndexedDB();

      if (projects.length === 0) {
        // First time user - will need to create a project
        isFirstTimeUser.value = true;
        return null;
      } else {
        // User has projects, set the most recently created one as current
        const sortedProjects = projects.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        const now = new Date();
        const mostRecentProject: Project = {
          id: sortedProjects[0].id,
          name: sortedProjects[0].name,
          createdAt: new Date(sortedProjects[0].createdAt),
          lastUsedAt: now,
          updatedAt: now,
        };

        setCurrentProject(mostRecentProject);
        return currentProject.value;
      }
    } catch (error) {
      console.error('Failed to initialize current project:', error);
      return null;
    }
  };

  return {
    // State
    currentProject,
    isFirstTimeUser,

    // Computed
    hasCurrentProject,
    currentProjectId,
    currentProjectName,

    // Actions
    setCurrentProject,
    clearCurrentProject,
    loadCurrentProjectFromStorage,
    checkFirstTimeUser,
    initializeCurrentProject,
  };
});

// Composable for easy access
export const useCurrentProject = () => {
  const store = useCurrentProjectStore();
  return store;
};
