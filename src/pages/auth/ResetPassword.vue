<template>
  <AuthBackground>
    <AuthCard
      :error-message="errorMessage"
      :loading="isResettingPassword"
      :message="showMessage"
      :is-invalid="!isValid"
      @submit="onSubmit"
    >
      <template #title> {{ t('title.reset_password') }} </template>
      <template #button-text> {{ t('button.reset_password') }} </template>
      <ResetPasswordForm
        :new-password="newPassword"
        :new-confirm-password="newConfirmPassword"
        :errors="errors"
        :error-message="errorMessage"
        @update:new-password="newPassword = $event"
        @update:new-confirm-password="newConfirmPassword = $event"
        @blur:new-password="handleBlurNewPassword"
        @blur:new-confirm-password="handleBlurNewConfirmPassword"
      />
    </AuthCard>
  </AuthBackground>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCard from '@/components/auth/AuthCard.vue';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm.vue';
import { useUser } from '@/composables/query/useUser';
import { useFormValidation } from '@/composables/useFormValidation';
import { createResetPasswordSchema } from '@/utils/schemas/resetPasswordSchema';

const { t } = useI18n();
const router = useRouter();

const errorMessage = ref<string | undefined>(undefined);
const showMessage = ref<string | undefined>(undefined);
const email = ref<string>('');
const token = ref<string>('');
const uid = ref<string>('');
const { resetPassword, isResettingPassword } = useUser();

// Base64URL decode helper
const base64UrlDecode = (input: string): string => {
  let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = base64.length % 4;
  if (pad) base64 += '='.repeat(4 - pad);
  return atob(base64);
};

// Decode JWT and extract email
const decodeEmailFromAccessToken = (token: string): string | undefined => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return undefined;
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson) as { email?: string };
    return payload.email;
  } catch {
    return undefined;
  }
};

const { handleSubmit, errors } = useFormValidation(createResetPasswordSchema(t), {
  newPassword: '',
  newConfirmPassword: '',
});

// 從 URL hash 的 access_token 解出 email；退而求其次使用 query 或 localStorage
const initializeParams = () => {
  // 1) 優先：從 URL hash 解析 access_token
  const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : '';
  const hashParams = new URLSearchParams(hash);
  const accessToken = hashParams.get('access_token');

  if (accessToken) {
    const decodedEmail = decodeEmailFromAccessToken(accessToken);
    if (decodedEmail) {
      email.value = decodedEmail;
      localStorage.setItem('resetPasswordEmail', decodedEmail);
      return;
    }
  }

  // 2) 次要：從 URL query ?email=
  const searchParams = new URLSearchParams(window.location.search);
  const queryEmail = searchParams.get('email');
  const queryToken = searchParams.get('token');
  const queryUid = searchParams.get('uid');

  if (queryEmail) {
    email.value = decodeURIComponent(queryEmail);
    localStorage.setItem('resetPasswordEmail', email.value);
  }

  if (queryToken) {
    token.value = queryToken;
  }

  if (queryUid) {
    uid.value = queryUid;
  }

  if (email.value && token.value && uid.value) {
    return;
  }

  // 3) 最後：localStorage
  const storedEmail = localStorage.getItem('resetPasswordEmail');
  if (storedEmail) {
    email.value = storedEmail;
  }

  if (!token.value || !uid.value || !email.value) {
    errorMessage.value = t('error.invalid_or_expired_token');
    setTimeout(() => {
      router.push({ name: 'forgot-password' });
    }, 3000);
  }
};

initializeParams();

const { value: newPassword, handleBlur: handleBlurNewPassword } = useField<string>('newPassword');
const { value: newConfirmPassword, handleBlur: handleBlurNewConfirmPassword } =
  useField<string>('newConfirmPassword');

const isValid = computed(() => {
  return newPassword.value && newConfirmPassword.value && Object.keys(errors.value).length === 0;
});

const onSubmit = handleSubmit(async (values) => {
  errorMessage.value = undefined;
  showMessage.value = undefined;

  if (!email.value || !token.value || !uid.value) {
    errorMessage.value = t('error.invalid_or_expired_token');
    return;
  }

  try {
    const { success, message } = await resetPassword({
      email: email.value,
      newPassword: values.newPassword,
      newConfirmPassword: values.newConfirmPassword,
      token: token.value,
      uid: uid.value,
    });

    if (success) {
      showMessage.value = t('success.password_reset_success');
      localStorage.removeItem('resetPasswordEmail');
      setTimeout(() => {
        router.push({ name: 'login' });
      }, 2000);
    } else {
      errorMessage.value = message || t('error.reset_password_failed');
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    if (err?.response?.data?.message) {
      errorMessage.value = err.response.data.message;
      if (err.response.data.message.includes('invalid or expired')) {
        setTimeout(() => {
          router.push({ name: 'forgot-password' });
        }, 3000);
      }
    } else {
      errorMessage.value = t('error.reset_password_failed');
    }
  }
});
</script>
