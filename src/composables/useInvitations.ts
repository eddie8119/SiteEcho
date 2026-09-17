import { ElMessage } from 'element-plus';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { CollaboratorRole } from '@/types/collaborator';
import type { CollaboratorInvitationResponse } from '@/types/response';

import {
  acceptInvitation,
  cancelInvitation,
  createGlobalInvitation,
  createProjectInvitation,
  getInvitationByToken,
  getMyInvitations,
  getSentInvitations,
  rejectInvitation,
} from '@/api/invitation';

export const useInvitations = () => {
  const { t } = useI18n();
  const invitations = ref<CollaboratorInvitationResponse[]>([]);
  const isLoading = ref(false);

  const fetchInvitations = async () => {
    isLoading.value = true;
    try {
      const data = await getMyInvitations();
      invitations.value = data;
    } catch (error) {
      console.error('Failed to fetch invitations:', error);
      ElMessage.error(t('message.error.failed_to_fetch'));
    } finally {
      isLoading.value = false;
    }
  };

  const accept = async (invitationToken: string) => {
    try {
      await acceptInvitation(invitationToken);
      ElMessage.success(t('message.invitation.accepted'));
      await fetchInvitations();
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      ElMessage.error(t('message.invitation.accept_failed'));
      throw error;
    }
  };

  const reject = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId);
      ElMessage.success(t('message.invitation.rejected'));
      await fetchInvitations();
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      ElMessage.error(t('message.invitation.reject_failed'));
    }
  };

  return {
    invitations,
    isLoading,
    fetchInvitations,
    accept,
    reject,
  };
};

export const useSentInvitations = () => {
  const { t } = useI18n();
  const sentInvitations = ref<CollaboratorInvitationResponse[]>([]);
  const isLoading = ref(false);

  const fetchSentInvitations = async () => {
    isLoading.value = true;
    try {
      const data = await getSentInvitations();
      sentInvitations.value = data;
    } catch (error) {
      console.error('Failed to fetch sent invitations:', error);
      ElMessage.error(t('message.error.failed_to_fetch'));
    } finally {
      isLoading.value = false;
    }
  };

  const cancel = async (invitationId: string) => {
    try {
      await cancelInvitation(invitationId);
      ElMessage.success(t('message.invitation.cancelled'));
      await fetchSentInvitations();
    } catch (error) {
      console.error('Failed to cancel invitation:', error);
      ElMessage.error(t('message.invitation.cancel_failed'));
    }
  };

  return {
    sentInvitations,
    isLoading,
    fetchSentInvitations,
    cancel,
  };
};

export const useCreateInvitation = () => {
  const { t } = useI18n();
  const isCreating = ref(false);

  const createProject = async (projectId: string) => {
    isCreating.value = true;
    try {
      await createProjectInvitation(projectId);
      ElMessage.success(t('message.invitation.created'));
    } catch (error: unknown) {
      console.error('Failed to create project invitation:', error);
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 403) {
        ElMessage.error(t('message.invitation.pro_required'));
      } else if (status === 409) {
        ElMessage.error(t('message.invitation.max_collaborators'));
      } else {
        ElMessage.error(t('message.invitation.create_failed'));
      }
      throw error;
    } finally {
      isCreating.value = false;
    }
  };

  const createGlobal = async (collaboratorEmail: string, role: CollaboratorRole) => {
    isCreating.value = true;
    try {
      await createGlobalInvitation(collaboratorEmail, role);
      ElMessage.success(t('message.invitation.sent'));
    } catch (error: unknown) {
      console.error('Failed to create global invitation:', error);
      if ((error as { response?: { status?: number } }).response?.status === 409) {
        ElMessage.error(t('message.invitation.already_exists'));
      } else {
        ElMessage.error(t('message.invitation.send_failed'));
      }
      throw error;
    } finally {
      isCreating.value = false;
    }
  };

  return {
    isCreating,
    createProject,
    createGlobal,
  };
};

// 获取我的邀请
export const useMyInvitations = () => {
  const { t } = useI18n();
  const invitations = ref<CollaboratorInvitationResponse[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const refetch = async () => {
    isLoading.value = true;
    error.value = null;
    try {
      const data = await getMyInvitations();
      invitations.value = data;
    } catch (err: unknown) {
      console.error('Failed to fetch invitations:', err);
      error.value = (err as Error).message || t('message.error.failed_to_fetch');
    } finally {
      isLoading.value = false;
    }
  };

  return {
    invitations,
    isLoading,
    error,
    refetch,
  };
};

// 通过token获取邀请详情
export const useInvitationByToken = (token: { value: string | null }) => {
  const { t } = useI18n();
  const invitation = ref<CollaboratorInvitationResponse | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const refetch = async () => {
    if (!token.value) {
      error.value = t('message.invitation.invalid_token');
      return;
    }

    isLoading.value = true;
    error.value = null;
    try {
      const data = await getInvitationByToken(token.value);
      invitation.value = data;
    } catch (err: unknown) {
      console.error('Failed to fetch invitation:', err);
      const errorResponse = err as { response?: { status?: number } };
      if (errorResponse.response?.status === 404) {
        error.value = t('message.invitation.not_found');
      } else if (errorResponse.response?.status === 410) {
        error.value = t('message.invitation.expired');
      } else {
        error.value = t('message.invitation.load_failed');
      }
    } finally {
      isLoading.value = false;
    }
  };

  return {
    invitation,
    isLoading,
    error,
    refetch,
  };
};

// 接受邀请
export const useAcceptInvitation = () => {
  const isAccepting = ref(false);

  const accept = async (invitationToken: string) => {
    isAccepting.value = true;
    try {
      await acceptInvitation(invitationToken);
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    } finally {
      isAccepting.value = false;
    }
  };

  return {
    accept,
    isAccepting,
  };
};

// 拒绝邀请
export const useRejectInvitation = () => {
  const isRejecting = ref(false);

  const reject = async (invitationId: string) => {
    isRejecting.value = true;
    try {
      await rejectInvitation(invitationId);
    } catch (error) {
      console.error('Failed to reject invitation:', error);
      throw error;
    } finally {
      isRejecting.value = false;
    }
  };

  return {
    reject,
    isRejecting,
  };
};
