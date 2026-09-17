<template>
  <AuthBackground>
    <AuthCardBanner
      :error-message="errorMessage"
      :message="showMessage"
      :loading="isSubmitting"
      :is-invalid="!isValid"
      @submit="onSubmit"
    >
      <template #title> {{ t('title.register') }} </template>
      <template #button-text> {{ t('button.register') }} </template>
      <RegisterForm
        :email="email"
        :password="password"
        :confirm-password="confirmPassword"
        :errors="errors"
        @update:email="email = $event"
        @update:password="password = $event"
        @update:confirm-password="confirmPassword = $event"
        @blur:email="handleBlurEmail"
        @blur:password="handleBlurPassword"
        @blur:confirm-password="handleBlurConfirmPassword"
        @sso-login="handleSsoLogin"
      />
    </AuthCardBanner>
  </AuthBackground>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { SsoProvider } from '@/constants/provider';
import type { RegisterData } from '@/types/user';
import type { AxiosError } from 'axios';

import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCardBanner from '@/components/auth/AuthCardBanner.vue';
import RegisterForm from '@/components/auth/RegisterForm.vue';
import { useAuth } from '@/composables/query/useAuth';
import { useUser } from '@/composables/query/useUser';
import { useFormError } from '@/composables/useFormError';
import { useFormValidation } from '@/composables/useFormValidation';
import router from '@/router';
import { useAuthStore } from '@/stores/useAuthStore';
import { createRegisterSchema } from '@/utils/schemas/registerSchema';

const { t } = useI18n();
const authStore = useAuthStore();

const showMessage = ref<string | undefined>(undefined);

const { handleSubmit, errors, isSubmitting } = useFormValidation<RegisterData>(
  createRegisterSchema(t),
  {
    email: '',
    password: '',
    confirmPassword: '',
  }
);

const { value: email, handleBlur: handleBlurEmail } = useField<string>('email');
const { value: password, handleBlur: handleBlurPassword } = useField<string>('password');
const { value: confirmPassword, handleBlur: handleBlurConfirmPassword } =
  useField<string>('confirmPassword');

const isValid = computed(() => {
  return (
    email.value && password.value && confirmPassword.value && Object.keys(errors.value).length === 0
  );
});

const { errorMessage, handleError } = useFormError({
  statusCodes: [400, 409],
  defaultErrorKey: t('error.register_failed'),
});

const { register } = useUser();
const { ssoLogin } = useAuth();

const onSubmit = handleSubmit(async (values: RegisterData) => {
  if (password.value !== confirmPassword.value) return;

  try {
    const { success, message } = await register(values);
    if (!success) {
      // Create a proper error object for handleError to process
      const customError = {
        response: {
          status: 409,
          data: {
            message,
            code: message?.includes('already registered with')
              ? 'USER_EXISTS_WITH_SSO'
              : 'USER_ALREADY_EXISTS',
          },
        },
      };
      handleError(customError as AxiosError);
      return;
    }
    if (success) {
      showMessage.value = t('message.dialog.check_the_email');
      authStore.setPendingActivationEmail(email.value);

      // 註冊成功，導向註冊成功頁面
      setTimeout(() => {
        router.push({
          name: 'registration-success',
          query: {
            email: email.value,
          },
        });
      }, 500);
    }
  } catch (error) {
    handleError(error as AxiosError);
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
