<template>
  <AuthBackground>
    <div class="flex h-full w-full items-center justify-center">
      <div class="w-full max-w-[420px] p-4">
        <div
          class="auth-container flex min-h-[410px] flex-col justify-center overflow-hidden rounded-[32px] p-6 shadow-[0_30px_80px_rgba(12,21,31,0.15)]"
        >
          <!-- Loading State -->
          <div v-if="isLoading" class="flex flex-col items-center justify-center py-12">
            <ElIcon class="is-loading mb-4 text-brand-primary" :size="48">
              <Loading />
            </ElIcon>
            <p class="text-gray-600">{{ t('common.loading') }}</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="flex flex-col items-center justify-center py-8 text-center">
            <div
              class="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-50"
            >
              <ElIcon class="text-secondary-red" :size="40">
                <WarningFilled />
              </ElIcon>
            </div>
            <h2 class="mb-4 text-[24px] font-semibold text-gray-900">
              {{ t('title.invitation_error') }}
            </h2>
            <p class="mb-8 text-[14px] text-gray-500">
              {{ error }}
            </p>
            <TextButton variant="primary" size="md" @click="router.push('/')">
              {{ t('button.back_to_home') }}
            </TextButton>
          </div>

          <!-- Invitation Details -->
          <div v-else-if="invitation" class="flex flex-col items-center text-center">
            <div class="mx-auto mb-6 flex items-center justify-center gap-3">
              <img
                src="@/assets/icons/CompanyLogo.png"
                alt="logo Icon"
                class="icon-logo w-[35px]"
              />
              <img
                src="@/assets/icons/SiteNearLogo.png"
                alt="logo Icon"
                class="icon-logo w-[120px]"
              />
            </div>

            <h1 class="mb-2 text-[24px] font-semibold text-gray-900">
              {{ t('title.collaboration_invitation') }}
            </h1>
            <p class="mb-6 text-[14px] text-gray-500">
              {{ invitation.inviterName }} {{ t('message.invitation.invited_you') }}
            </p>

            <div class="mb-6 w-full space-y-3 rounded-xl bg-orange-50/50 p-4 text-left">
              <div class="flex items-center justify-between border-b border-orange-100 pb-3">
                <span class="font-semibold text-gray-700">
                  {{ t('label.project.project_name') }}
                </span>
                <span class="font-medium text-gray-900">{{ invitation.projectName }}</span>
              </div>

              <div class="flex items-center justify-between">
                <span class="font-semibold text-gray-700">
                  {{ t('label.invitation.expires_at') }}
                </span>
                <span class="text-gray-600">{{
                  formatDateTimeToMinutes(invitation.expiresAt)
                }}</span>
              </div>
            </div>

            <!-- Logged in user -->
            <div v-if="authStore.isAuthenticated" class="w-full space-y-4">
              <p class="text-sm font-medium text-brand-primary">
                {{ t('message.invitation.ready_to_accept') }}
              </p>
              <TextButton
                variant="primary"
                size="md"
                full-width
                :loading="isAccepting"
                @click="handleAccept"
              >
                {{ t('button.join_project') }}
              </TextButton>
            </div>

            <!-- Not logged in -->
            <div v-else class="w-full space-y-4">
              <p class="text-sm font-medium text-brand-primary">
                {{ t('message.invitation.login_required') }}
              </p>

              <div class="flex gap-4">
                <TextButton
                  variant="primary"
                  size="md"
                  class="flex-1"
                  @click="router.push(`/auth/login?redirect=/invitation/accept?token=${token}`)"
                >
                  {{ t('button.login') }}
                </TextButton>
                <TextButton
                  variant="ghost"
                  size="md"
                  class="flex-1"
                  @click="router.push(`/auth/register?redirect=/invitation/accept?token=${token}`)"
                >
                  {{ t('button.register') }}
                </TextButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AuthBackground>
</template>

<script setup lang="ts">
import { Loading, WarningFilled } from '@element-plus/icons-vue';
import { ElIcon, ElMessage } from 'element-plus';
import { computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import type { AxiosError } from 'axios';

import AuthBackground from '@/components/auth/AuthBackground.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import { useFormError } from '@/composables/useFormError';
import { useAcceptInvitation, useInvitationByToken } from '@/composables/useProjectInvitation';
import { useAuthStore } from '@/stores/useAuthStore';
import { formatDateTimeToMinutes } from '@/utils/date';
import { shouldUseMobileLayout } from '@/utils/deviceDetector';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const token = computed(() => {
  return (route.params.token as string) || (route.query.token as string) || '';
});

const { invitation, isLoading, error, refetch } = useInvitationByToken(token);
const { accept, isAccepting } = useAcceptInvitation();
const { handleError } = useFormError({
  statusCodes: [400, 401, 403, 404, 410],
  defaultErrorKey: t('message.invitation.accept_failed'),
});

onMounted(() => {
  refetch();
});

const handleAccept = async () => {
  if (!invitation.value) return;

  try {
    await accept(invitation.value.token);
    ElMessage.success(t('message.invitation.accepted'));

    // Redirect to an existing device-specific project page.
    setTimeout(() => {
      const projectId = invitation.value?.projectId;
      if (!projectId) return;

      if (shouldUseMobileLayout()) {
        router.push({ path: '/mobile/timeline', query: { projectId } });
      } else {
        router.push({ path: '/desktop/photos', query: { projectId } });
      }
    }, 1500);
  } catch (err) {
    handleError(err as AxiosError);
  }
};
</script>
