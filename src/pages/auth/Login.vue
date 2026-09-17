<template>
  <AuthBackground>
    <AuthCardBanner
      :error-message="errorMessage"
      :loading="isSubmitting || isSyncing"
      :is-invalid="!isValid"
      :is-syncing="isSyncing"
      :sync-progress="syncProgress"
      @submit="onSubmit"
    >
      <template #title> {{ t('title.welcome') }} </template>
      <!-- <template #subtitle> {{ t('subtitle.auth.login') }} </template> -->
      <template #button-text>
        {{ isSyncing ? t('message.syncing') : t('button.login') }}
      </template>
      <LoginForm
        :email="email"
        :password="password"
        :errors="errors"
        @update:email="email = $event"
        @update:password="password = $event"
        @blur:email="handleBlurEmail"
        @blur:password="handleBlurPassword"
        @sso-login="handleSsoLogin"
      />
    </AuthCardBanner>
  </AuthBackground>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import type { SsoProvider } from '@/constants/provider';
import type { LoginData } from '@/types/user';
import type { AxiosError } from 'axios';

import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCardBanner from '@/components/auth/AuthCardBanner.vue';
import LoginForm from '@/components/auth/LoginForm.vue';
import { useAuth } from '@/composables/query/useAuth';
import { useFormError } from '@/composables/useFormError';
import { useFormValidation } from '@/composables/useFormValidation';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { getAuthService } from '@/services/auth';
import { detectDevice } from '@/utils/deviceDetector';
import { createLoginSchema } from '@/utils/schemas/loginSchema';

const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { login, ssoLogin } = useAuth();
const { syncPhotos, isSyncing, syncProgress } = useRegistrationFlow();

const { handleSubmit, errors, isSubmitting } = useFormValidation<LoginData>(createLoginSchema(t), {
  email: '',
  password: '',
});

const { value: email, handleBlur: handleBlurEmail } = useField<string>('email');
const { value: password, handleBlur: handleBlurPassword } = useField<string>('password');

const isValid = computed(() => {
  return email.value && password.value && Object.keys(errors.value).length === 0;
});

const { errorMessage, handleError, setErrorMessage } = useFormError({
  statusCodes: [401],
  defaultErrorKey: t('message.login_failed'),
});

const resolveLoginErrorMessage = (message?: string) => {
  switch (message) {
    case 'AUTH_INVALID_CREDENTIALS':
      return t('message.auth.invalid_credentials');
    case 'AUTH_TOO_MANY_ATTEMPTS':
      return t('message.auth.too_many_attempts');
    case 'AUTH_EMAIL_UNVERIFIED':
      return t('message.auth.email_unverified');
    case 'AUTH_ACCOUNT_LOCKED':
      return t('message.auth.account_locked');
    default:
      return t('message.login_failed');
  }
};

const onSubmit = handleSubmit(async (values: LoginData) => {
  try {
    const { data: apiResponseData, success, message } = await login(values);

    // 登入失敗（例如 401），顯示對應錯誤訊息
    if (!success) {
      setErrorMessage(resolveLoginErrorMessage(message));
      await getAuthService().logout({ revokeRemote: false });
      return;
    }

    if (success && apiResponseData) {
      const { access_token, refresh_token } = apiResponseData;

      getAuthService().applySession({
        accessToken: access_token,
        refreshToken: refresh_token,
        role: 'user',
        source: 'backend',
      });

      // 觸發照片同步（登入成功後自動同步，繞過 WiFi 檢查以確保初始同步）
      await syncPhotos(true);

      const redirectParam = route.query.redirect;
      let redirectTo: string | { name: string };

      if (typeof redirectParam === 'string' && redirectParam.length > 0) {
        // 如果有 redirect 參數，使用該參數
        redirectTo = redirectParam;
      } else {
        // 沒有 redirect 參數時，根據設備類型決定預設導轉目標
        const device = detectDevice();
        if (device.isCapacitor || device.isMobile) {
          redirectTo = '/mobile/timeline';
        } else {
          redirectTo = { name: 'overview' };
        }
      }

      await router.replace(redirectTo);
    }
  } catch (error) {
    handleError(error as AxiosError);
    await getAuthService().logout({ revokeRemote: false });
  }
});

const handleSsoLogin = async (provider: SsoProvider) => {
  try {
    await ssoLogin(provider);
  } catch (error) {
    handleError(error as AxiosError);
  }
};
</script>
