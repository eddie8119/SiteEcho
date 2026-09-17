import { inject, provide, type Ref } from 'vue';

import type { ProjectTitle } from '@/types/project';

interface ProjectTitleListContext {
  projectTitleList: Ref<ProjectTitle[]>;
}

const PROJECT_TITLE_LIST_KEY = Symbol('projectTitleList');

export const provideProjectTitleList = (projectTitleList: Ref<ProjectTitle[]>) => {
  const context: ProjectTitleListContext = {
    projectTitleList,
  };

  provide(PROJECT_TITLE_LIST_KEY, context);

  return context;
};

export const useProjectTitleListContext = (): ProjectTitleListContext => {
  const context = inject<ProjectTitleListContext>(PROJECT_TITLE_LIST_KEY);

  if (!context) {
    throw new Error(
      'useProjectTitleList must be used within a component that calls provideProjectTitleList'
    );
  }

  return context;
};
