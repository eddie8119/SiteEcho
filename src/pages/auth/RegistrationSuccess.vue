<template>
  <AuthBackground>
    <AuthCardBanner
      :error-message="displayErrorMessage"
      :message="resendMessage"
      :loading="isResending"
      :show-submit-button="false"
    >
      <template #title>{{ t('title.register_success') }}</template>

      <div class="flex flex-col items-center">
        <img :src="check" alt="check" class="mb-6 h-16 w-16" />

        <p class="mb-2 text-center text-lg font-semibold">
          {{ t('message.dialog.check_email_for_activation') }}
        </p>

        <p class="text200-color-difference mb-6 text-center text-sm">
          {{ t('message.dialog.check_the_email') }}
          <span class="font-medium">{{ email }}</span>
        </p>

        <ElButton
          type="primary"
          size="large"
          :loading="isResending"
          block
          class="auth-brand-button w-full"
          @click="handleResendEmail"
        >
          {{ t('button.resend_activation_email') }}
        </ElButton>
      </div>
    </AuthCardBanner>
  </AuthBackground>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import check from '@/assets/images/check.png';
import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCardBanner from '@/components/auth/AuthCardBanner.vue';
import { useUser } from '@/composables/query/useUser';

const { t } = useI18n();
const route = useRoute();
const { resendActivation, isResending, resendError } = useUser();

const resendMessage = ref<string | null>(null);
const email = ref<string | undefined>(route.query.email as string | undefined);

const localErrorMessage = ref<string | null>(null);

const displayErrorMessage = computed(() => {
  return localErrorMessage.value ?? resendError.value?.message ?? null;
});

const handleResendEmail = async () => {
  resendMessage.value = null;
  localErrorMessage.value = null;

  if (!email.value) {
    localErrorMessage.value = t('error.invalid_email');
    return;
  }
  try {
    const { success, message } = await resendActivation({ email: email.value });

    if (success) {
      resendMessage.value = t('message.dialog.check_the_email');
    } else {
      localErrorMessage.value = message || t('error.resend_activation_failed');
    }
  } catch (error: unknown) {
    console.error('Failed to resend activation email:', error);
  }
};
</script>

<style lang="scss" scoped></style>
