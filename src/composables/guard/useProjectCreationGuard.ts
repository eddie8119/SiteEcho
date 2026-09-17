import { ElMessage } from 'element-plus';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { useCollaboratorInfo } from '@/composables/query/useCollaboratorInfo';

export const useProjectCreationGuard = () => {
  const { t } = useI18n();

  // Check if user is a pure collaborator (has no owned projects)
  const { isCollaborator } = useCollaboratorInfo();

  // Pure collaborators cannot create projects
  // Regular users can create unlimited projects
  const canCreateProject = computed(() => {
    return !isCollaborator.value;
  });

  const ensureCanCreateProject = () => {
    if (canCreateProject.value) {
      return true;
    }

    // Show message for collaborators
    ElMessage.warning(t('message.error.collaborator_cannot_create_project'));
    return false;
  };

  return {
    canCreateProject,
    isLoading: computed(() => false),
    isCollaborator,
    ensureCanCreateProject,
  };
};
