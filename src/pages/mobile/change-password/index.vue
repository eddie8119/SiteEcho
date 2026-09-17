<template>
  <MobileHeader :title="t('title.change_password')" />
  <div class="mobile-page-container">
    <div class="space-y-6">
      <ChangePasswordForm
        :old-password="oldPassword"
        :new-password="newPassword"
        :new-confirm-password="newConfirmPassword"
        :errors="errors"
        @update:old-password="oldPassword = $event"
        @update:new-password="newPassword = $event"
        @update:new-confirm-password="newConfirmPassword = $event"
        @blur:old-password="handleBlurOldPassword"
        @blur:new-password="handleBlurNewPassword"
        @blur:new-confirm-password="handleBlurNewConfirmPassword"
      />
      <TextButton
        variant="primary"
        size="md"
        full-width
        :loading="isSubmitting"
        type="button"
        @click="onSubmit"
      >
        {{ t('button.change_password') }}
      </TextButton>
      <div v-if="errorMessage" class="text-sm text-red-600">
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod';
import { ElMessage } from 'element-plus';
import { useField, useForm } from 'vee-validate';
import { useI18n } from 'vue-i18n';

import type { AxiosError } from 'axios';

import ChangePasswordForm from '@/components/auth/ChangePasswordForm.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import MobileHeader from '@/components/core/header/MobileHeader.vue';
import { useUser } from '@/composables/query/useUser';
import { useAuthentication } from '@/composables/useAuthentication';
import { useFormError } from '@/composables/useFormError';
import { type ChangePasswordData } from '@/types/user';
import { createChangePasswordSchema } from '@/utils/schemas/changePasswordSchema';

const { t } = useI18n();

const { handleSubmit, errors, isSubmitting, resetForm } = useForm<ChangePasswordData>({
  validationSchema: toTypedSchema(createChangePasswordSchema(t)),
  initialValues: {
    oldPassword: '',
    newPassword: '',
    newConfirmPassword: '',
  },
});

const { errorMessage, handleError } = useFormError({
  statusCodes: [400],
  defaultErrorKey: t('message.error.change'),
});

const { changePassword } = useUser();
const { logoutAction } = useAuthentication();

const { value: oldPassword, handleBlur: handleBlurOldPassword } = useField<string>('oldPassword');
const { value: newPassword, handleBlur: handleBlurNewPassword } = useField<string>('newPassword');
const { value: newConfirmPassword, handleBlur: handleBlurNewConfirmPassword } =
  useField<string>('newConfirmPassword');

const onSubmit = handleSubmit(async (values: ChangePasswordData) => {
  try {
    const { success, message } = await changePassword(values);

    if (success) {
      ElMessage.success(t('message.success.change'));
      resetForm();
      logoutAction();
    } else {
      errorMessage.value = message || t('message.error.change');
    }
  } catch (error) {
    handleError(error as AxiosError);
  }
});
</script>
