import { useMutation, useQuery } from '@tanstack/vue-query';
import { ElMessage } from 'element-plus';
import { computed, type ComputedRef, ref, unref } from 'vue';
import { useI18n } from 'vue-i18n';

import { acceptInvitation, createProjectInvitation, getInvitationByToken } from '@/api/invitation';

/**
 * Create project invitation (V1: Share link, no email)
 */
export const useCreateProjectInvitation = (projectId: string) => {
  const { t } = useI18n();
  const isCreating = ref(false);

  const create = async () => {
    isCreating.value = true;
    try {
      const result = await createProjectInvitation(projectId);
      ElMessage.success(t('message.invitation.created'));
      return result;
    } catch (error: unknown) {
      console.error('Failed to create project invitation:', error);
      if ((error as { response?: { status?: number } }).response?.status === 403) {
        ElMessage.error(t('message.invitation.pro_required'));
      } else if ((error as { response?: { status?: number } }).response?.status === 409) {
        ElMessage.error(t('message.invitation.max_collaborators'));
      } else {
        ElMessage.error(t('message.invitation.create_failed'));
      }
      throw error;
    } finally {
      isCreating.value = false;
    }
  };

  return {
    isCreating,
    create,
  };
};

/**
 * Get invitation details by token (public)
 */
export const useInvitationByToken = (
  token: string | ComputedRef<string | undefined> | null | undefined
) => {
  const { t } = useI18n();
  const resolvedToken = unref(token);

  const {
    data: invitation,
    isLoading,
    error: queryError,
    refetch,
  } = useQuery({
    queryKey: ['invitationByToken', resolvedToken],
    queryFn: async () => {
      if (!resolvedToken) throw new Error('Token is required');
      return await getInvitationByToken(resolvedToken);
    },
    enabled: !!resolvedToken,
    retry: false,
  });

  const error = computed(() => {
    if (!resolvedToken) return t('message.invitation.invalid_token');
    if (queryError.value) {
      const status = (queryError.value as { response?: { status?: number } }).response?.status;
      if (status === 404) return t('message.invitation.not_found');
      if (status === 410) return t('message.invitation.expired');
      return t('message.invitation.fetch_failed');
    }
    return null;
  });

  return {
    invitation,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Accept invitation (single-use token)
 */
export const useAcceptInvitation = () => {
  const { t } = useI18n();

  const acceptMutation = useMutation({
    mutationFn: (token: string) => acceptInvitation(token),
    onError: (error: unknown) => {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 409) {
        ElMessage.error(t('message.invitation.already_member'));
      } else if (status === 410) {
        ElMessage.error(t('message.invitation.already_used'));
      } else {
        ElMessage.error(t('message.invitation.accept_failed'));
      }
    },
  });

  return {
    accept: acceptMutation.mutate,
    isAccepting: acceptMutation.isPending,
  };
};
