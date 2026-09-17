import { computed } from 'vue';

import type { ProjectTitle } from '@/types/project';
import type { ProjectResponse } from '@/types/response';
import type { ConstructionSelection } from '@/types/selection';

import { useProjects } from '@/composables/query/useProjects';

export function useOverviewSources() {
  const { fetchedProjects, isLoadingProjects } = useProjects();

  // Extract and deduplicate construction containers
  const constructionList = computed(() => {
    if (!fetchedProjects.value || fetchedProjects.value.length === 0) {
      return [];
    }

    // Collect all construction containers
    const allConstructions = fetchedProjects.value.flatMap((project: ProjectResponse) => {
      return project.constructionContainer || [];
    });

    // Deduplicate by id
    const seen = new Set<string>();
    const unique = allConstructions.filter((construction: ConstructionSelection) => {
      if (seen.has(construction.id)) {
        return false;
      }
      seen.add(construction.id);
      return true;
    });

    return unique;
  });

  // Extract project id and title
  const projectTitleList = computed(() => {
    if (!fetchedProjects.value || fetchedProjects.value.length === 0) {
      return [] as ProjectTitle[];
    }
    return fetchedProjects.value.map((project: ProjectResponse) => ({
      id: project.id,
      title: project.name,
    }));
  });

  return {
    fetchedProjects,
    isLoadingProjects,
    constructionList,
    projectTitleList,
  };
}
