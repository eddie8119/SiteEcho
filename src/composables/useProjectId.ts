import { useRoute } from 'vue-router';

export const useProjectId = () => {
  const route = useRoute();
  const projectId = route.params.id as string;
  return { projectId };
};
