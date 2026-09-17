<template>
  <AuthCard
    :error-message="errorMessage"
    :message="showMessage"
    :loading="isResending"
    :is-invalid="!isValid || resendCooldown > 0"
    @submit="onSubmit"
  >
    <template #title>
      {{ t('title.resend_activation') }}
    </template>
    <template #button-text>
      {{ t('button.resend') }}
    </template>

    <ElForm>
      <ElFormItem :error="errors.email">
        <ElInput
          v-model="email"
          type="email"
          :placeholder="t('placeholder.auth.email')"
          @blur="handleBlurEmail"
        />
      </ElFormItem>
    </ElForm>
  </AuthCard>
</template>

<script setup lang="ts">
import { useField } from 'vee-validate';
import { computed, onActivated, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import type { ResendActivationData } from '@/types/user';

import AuthCard from '@/components/auth/AuthCard.vue';
import { useUser } from '@/composables/query/useUser';
import { useFormValidation } from '@/composables/useFormValidation';
import { resendActivationSchema } from '@/utils/schemas/resendActivationSchema';

const { t } = useI18n();
const route = useRoute();

const showMessage = ref<string | null>(null);
const resendCooldown = ref<number>(0);

const { handleSubmit, errors } = useFormValidation<ResendActivationData>(
  resendActivationSchema(t),
  {
    email: '',
  }
);

const { value: email, handleBlur: handleBlurEmail } = useField<string>('email');

const getEmail = (): void => {
  if (route.query.email) {
    email.value = route.query.email as string;
  }
};

onActivated(() => {
  getEmail();
});

const startCooldown = () => {
  resendCooldown.value = 60;
  const timer = setInterval(() => {
    resendCooldown.value--;
    if (resendCooldown.value <= 0) {
      clearInterval(timer);
    }
  }, 1000);
};

const isValid = computed(() => {
  return email.value && Object.keys(errors.value).length === 0;
});

const { resendActivation, isResending, resendError } = useUser();
const errorMessage = computed(() => resendError.value?.message ?? null);

const onSubmit = handleSubmit(async (values: ResendActivationData) => {
  showMessage.value = null;
  resendError.value = null;

  if (resendCooldown.value > 0) {
    resendError.value = new Error(
      t('message.error.please_wait_before_resend', { seconds: resendCooldown.value })
    );
    return;
  }

  try {
    const { success, message } = await resendActivation(values);
    if (success) {
      showMessage.value = t('message.dialog.check_the_email');
      startCooldown();
    } else {
      resendError.value = new Error(message || t('error.resend_activation_failed'));
    }
  } catch (err: unknown) {
    const error = err as { response?: { data?: { message?: string } } };
    if (error?.response?.data?.message) {
      resendError.value = new Error(error.response.data.message as string);
    } else {
      resendError.value = new Error(t('error.resend_activation_failed'));
    }
  }
});
</script>
