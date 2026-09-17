<template>
  <AuthBackground>
    <AuthCard
      :error-message="errorMessage"
      :message="showMessage"
      :loading="isForgettingPassword"
      :is-invalid="!isValid"
      @submit="onSubmit"
    >
      <template #title> {{ t('title.forgot_password') }} </template>
      <template #button-text> {{ t('button.send_reset_email') }} </template>
      <ForgotPasswordForm
        :email="email"
        :errors="errors"
        @update:email="email = $event"
        @blur:email="handleBlurEmail"
      />
    </AuthCard>
  </AuthBackground>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ForgotPasswordData } from '@/types/user';

import AuthBackground from '@/components/auth/AuthBackground.vue';
import AuthCard from '@/components/auth/AuthCard.vue';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm.vue';
import { useUser } from '@/composables/query/useUser';
import { useFormValidation } from '@/composables/useFormValidation';
import { forgotPasswordSchema } from '@/utils/schemas/forgotPasswordSchema';

const { t } = useI18n();
const showMessage = ref<string | null>(null);
const { forgotPassword, isForgettingPassword, forgotPasswordError } = useUser();
const { handleSubmit, errors } = useFormValidation<ForgotPasswordData>(forgotPasswordSchema(t), {
  email: '',
});
const { value: email, handleBlur: handleBlurEmail } = useField<string>('email');

const isValid = computed(() => {
  return email.value && Object.keys(errors.value).length === 0;
});
const errorMessage = computed(() => forgotPasswordError.value?.message ?? null);

const onSubmit = handleSubmit(async (values: ForgotPasswordData) => {
  showMessage.value = null;
  forgotPasswordError.value = null;

  try {
    const { success, message } = await forgotPassword(values);

    if (success) {
      showMessage.value = t('message.dialog.check_the_email');
    } else {
      forgotPasswordError.value = new Error(message || t('error.reset_password_failed'));
    }
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    if (err?.response?.data?.message) {
      forgotPasswordError.value = new Error(err.response.data.message);
    } else {
      forgotPasswordError.value = new Error(t('error.reset_password_failed'));
    }
  }
});
</script>
