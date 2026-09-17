<template>
  <ElDialog
    v-model="dialogVisible"
    :title="t('title.manage_collaborators')"
    :width="computedWidth"
    :close-on-click-modal="true"
    :z-index="40"
    align-center
    @close="handleClose"
  >
    <!-- Member count -->
    <div class="mb-4 flex items-center justify-between">
      <span class="text-sm font-medium text-gray-600">
        {{ t('setting.membersList') }}: {{ memberCount }} / {{ MAX_COLLABORATORS }}
      </span>
    </div>

    <!-- Member list -->
    <div v-if="isLoadingCollaborators" class="flex items-center justify-center py-8">
      <ElIcon class="is-loading" :size="32">
        <Loading />
      </ElIcon>
    </div>

    <div v-else-if="collaborators && collaborators.length > 0" class="space-y-2">
      <div
        v-for="member in collaborators"
        :key="member.id"
        class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3"
      >
        <div class="flex items-center gap-3">
          <div
            class="bg-brand-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium text-brand-primary"
          >
            {{ getInitials(member.collaboratorName || member.collaboratorEmail) }}
          </div>
          <div class="min-w-0">
            <p
              v-if="member.collaboratorName"
              class="truncate text-xs text-gray-500"
              :title="member.collaboratorEmail"
            >
              {{ truncateText(member.collaboratorEmail) }}
            </p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <TextButton
            v-if="isOwner"
            variant="ghost"
            size="sm"
            class="text-red-500 hover:bg-red-50"
            :loading="removingId === member.id"
            @click="handleRemove(member.id)"
          >
            {{ t('setting.remove') }}
          </TextButton>
        </div>
      </div>
    </div>

    <div v-else class="py-8 text-center text-sm text-gray-400">
      {{ t('message.sign.no_collaborators') }}
    </div>

    <!-- Invite section -->
    <div class="mt-6 border-t border-gray-100 pt-4">
      <!-- Pro user: invite link generation -->
      <template v-if="isPro">
        <div v-if="invitationUrl" class="space-y-3">
          <div class="rounded-lg bg-orange-50 p-3">
            <p class="mb-2 text-xs text-brand-primary">{{ t('message.invitation.created') }}</p>
            <div class="flex items-center gap-2">
              <input
                :value="invitationUrl"
                readonly
                class="flex-1 rounded border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button
                class="flex flex-shrink-0 items-center justify-center rounded-lg bg-orange-100 text-brand-primary transition-colors"
                @click="copyLink"
              >
                <ElIcon :size="16"><DocumentCopy /></ElIcon>
              </button>
            </div>
          </div>
          <div v-if="canShare" class="flex gap-2">
            <TextButton variant="outline" size="sm" @click="shareLink">
              {{ t('title.share') }}
            </TextButton>
          </div>
        </div>
        <div v-else class="flex justify-center gap-2">
          <TextButton
            variant="primary"
            size="sm"
            :loading="isCreating"
            :disabled="memberCount >= MAX_COLLABORATORS"
            @click="handleCreateInvitation"
          >
            {{ t('setting.inviteMember') }}
          </TextButton>
        </div>
      </template>

      <!-- Free user: Pro upgrade prompt -->
      <template v-else>
        <div class="rounded-lg bg-amber-50 p-4 text-center">
          <p class="text-sm text-amber-800">
            {{ t('message.invitation.pro_required') }}
          </p>
          <TextButton variant="primary" size="sm" class="mt-3" @click="goToPricing">
            {{ t('billing.plans.pro.buttonText') }}
          </TextButton>
        </div>
      </template>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { DocumentCopy, Loading } from '@element-plus/icons-vue';
import { ElDialog, ElIcon, ElMessage } from 'element-plus';
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import TextButton from '@/components/core/button/TextButton.vue';
import { useProjectCollaborators } from '@/composables/query/useCollaborators';
import { useSubscription } from '@/composables/query/useSubscription';
import { useResponsiveWidth } from '@/composables/ui/useResponsiveWidth';
import { useCreateProjectInvitation } from '@/composables/useProjectInvitation';
import { MAX_PROJECT_COLLABORATORS } from '@/constants/project';

const props = defineProps<{
  modelValue: boolean;
  projectId: string;
  isOwner: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
}>();

const MAX_COLLABORATORS = MAX_PROJECT_COLLABORATORS;

const { t } = useI18n();
const router = useRouter();
const { isMobile } = useResponsiveWidth();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const computedWidth = computed(() => (isMobile.value ? '85vw' : '480px'));

const { isPaid } = useSubscription();
const isPro = computed(() => isPaid.value);

const invitationUrl = ref<string | null>(null);
const removingId = ref<string | null>(null);

const { collaborators, isLoadingCollaborators, handleRemoveCollaborator } = useProjectCollaborators(
  props.projectId
);

const { isCreating, create } = useCreateProjectInvitation(props.projectId);

const memberCount = computed(() => collaborators.value?.length ?? 0);

const canShare = computed(() => typeof navigator !== 'undefined' && !!navigator.share);

watch(dialogVisible, (visible) => {
  if (visible) {
    invitationUrl.value = null;
  }
});

const handleCreateInvitation = async () => {
  try {
    const result = await create();
    if (result?.invitationUrl) {
      invitationUrl.value = result.invitationUrl;
    }
  } catch {
    // Error already handled in composable
  }
};

const copyToClipboard = async (text: string): Promise<boolean> => {
  if (navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // fall through to fallback
    }
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch {
    return false;
  }
};

const copyLink = async () => {
  if (!invitationUrl.value) return;
  const success = await copyToClipboard(invitationUrl.value);
  if (success) {
    ElMessage.success(t('message.sign.link_copied'));
  } else {
    ElMessage.error(t('message.sign.copy_failed'));
  }
};

const shareLink = async () => {
  if (!invitationUrl.value) return;
  try {
    await navigator.share({
      title: 'SiteNear',
      text: t('message.invitation.invited_you'),
      url: invitationUrl.value,
    });
  } catch {
    // User cancelled or share failed — silently ignore
  }
};

const handleRemove = async (collaboratorId: string) => {
  removingId.value = collaboratorId;
  try {
    await handleRemoveCollaborator(collaboratorId);
  } finally {
    removingId.value = null;
  }
};

const goToPricing = () => {
  router.push('/pricing-menu');
};

const handleClose = () => {
  invitationUrl.value = null;
  emit('update:modelValue', false);
};

const EMAIL_TRUNCATE_LENGTH = 15;

const getInitials = (name: string): string => {
  if (!name) return '?';
  const parts = name.trim().split(/[\s@]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const truncateText = (value: string, limit = EMAIL_TRUNCATE_LENGTH): string => {
  if (!value || value.length <= limit) return value;
  return `${value.slice(0, limit)}...`;
};
</script>
