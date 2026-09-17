import { inject, provide, type Ref } from 'vue';

const PROJECT_ID_CONTEXT_KEY = Symbol('projectId');

export function provideProjectId(projectId: Ref<string | null>) {
  provide(PROJECT_ID_CONTEXT_KEY, projectId);
}

export function useProjectIdContext(): Ref<string | null> {
  const projectId = inject<Ref<string | null>>(PROJECT_ID_CONTEXT_KEY);
  if (!projectId) {
    throw new Error('useProjectIdContext must be used within a ProjectIdProvider');
  }
  return projectId;
}

export function useProjectIdContextOptional(): Ref<string | null> | undefined {
  return inject<Ref<string | null>>(PROJECT_ID_CONTEXT_KEY);
}
