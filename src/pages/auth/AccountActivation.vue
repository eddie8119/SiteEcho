<template>
  <AuthCard
    :error-message="errorMessage || (activateError?.message ?? '')"
    :loading="isActivating"
    :show-submit-button="false"
  >
    <template #title>{{ t('title.account_activation') }}</template>

    <div v-if="activationStatus === 'success'" class="flex flex-col items-center">
      <img :src="check" alt="check" class="mb-6 h-16 w-16" />
      <p class="mb-2 text-center text-lg font-semibold">
        {{ t('message.dialog.activation_success') }}
      </p>
      <div class="button-stack w-full space-y-3">
        <ElButton
          type="primary"
          size="large"
          block
          class="auth-brand-button w-full"
          @click="router.push({ name: 'login' })"
        >
          {{ t('button.login') }}
        </ElButton>
      </div>
    </div>

    <div v-else-if="activationStatus === 'error'" class="flex flex-col items-center">
      <img :src="close" alt="close" class="mb-6 h-16 w-16" />
      <p class="mb-2 text-center text-lg font-semibold">
        {{ t('message.dialog.activation_error') }}
      </p>
      <div class="button-stack w-full space-y-3">
        <ElButton
          type="primary"
          size="large"
          block
          class="auth-brand-button w-full"
          @click="retryActivation"
        >
          {{ t('button.try_again') }}
        </ElButton>
        <ElButton
          type="primary"
          size="large"
          block
          class="auth-brand-button w-full"
          @click="router.push({ name: 'login' })"
        >
          {{ t('button.login') }}
        </ElButton>
      </div>
    </div>

    <div v-else class="flex flex-col items-center">
      <ElIcon class="mb-4 animate-spin text-4xl text-blue-500">
        <Loading />
      </ElIcon>
      <p class="text-center text-lg">
        {{ t('message.dialog.activating') }}
      </p>
    </div>
  </AuthCard>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import check from '@/assets/images/check.png';
import close from '@/assets/images/close.png';
import AuthCard from '@/components/auth/AuthCard.vue';
import { useUser } from '@/composables/query/useUser';

const { t } = useI18n();
const route = useRoute();
const router = useRouter();

const errorMessage = ref<string>('');
const activationStatus = ref<'pending' | 'success' | 'error'>('pending');
const token = ref<string | null>((route.query.token as string) || null);
const email = ref<string | null>((route.query.email as string) || null);

const { activateAccount, isActivating, activateError } = useUser();

const activateAccountFlow = async () => {
  // 如果 query string 中沒有，嘗試從 hash 讀取（Supabase inviteUserByEmail 格式）
  if (!token.value && window.location.hash) {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    token.value = hashParams.get('access_token');
    // 從 Supabase auth 中取得 email
    if (token.value) {
      activationStatus.value = 'success';
      return;
    }
  }

  if (!token.value || !email.value) {
    errorMessage.value = t('error.invalid_activation_link');
    activationStatus.value = 'error';
    return;
  }

  try {
    await activateAccount({
      token: token.value,
      email: email.value,
    });
    activationStatus.value = 'success';
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    if (err?.response?.data?.message) {
      errorMessage.value = err.response.data.message;
    } else {
      errorMessage.value = t('error.activation_failed');
    }
    activationStatus.value = 'error';
  }
};

const retryActivation = async () => {
  activationStatus.value = 'pending';
  await activateAccountFlow();
};

onMounted(() => {
  activateAccountFlow();
});
</script>

<style lang="scss" scoped>
.button-stack :deep(.el-button + .el-button) {
  margin-left: 0 !important;
}
</style>
