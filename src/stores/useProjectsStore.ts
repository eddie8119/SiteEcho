import { defineStore } from 'pinia';
import { ref, type Ref } from 'vue';

import type { ProjectResponse } from '@/types/response';

export const useProjectsStore = defineStore('projects', () => {
  // State to hold the projects
  const projects: Ref<ProjectResponse[]> = ref([]);

  // Action to set the projects
  function setProjects(newProjects: ProjectResponse[]) {
    projects.value = newProjects;
  }

  return {
    projects,
    setProjects,
  };
});
