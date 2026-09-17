<template>
  <ElForm>
    <FormInput
      :model-value="props.oldPassword"
      name="oldPassword"
      type="password"
      :placeholder="t('placeholder.auth.old_password')"
      :error="props.errors?.oldPassword"
      icon="Lock"
      @update:model-value="emit('update:old-password', $event)"
      @blur="emit('blur:old-password')"
    />

    <FormInput
      :model-value="props.newPassword"
      name="newPassword"
      type="password"
      :placeholder="t('placeholder.auth.new_password')"
      :error="props.errors?.newPassword"
      icon="Lock"
      @update:model-value="emit('update:new-password', $event)"
      @blur="emit('blur:new-password')"
    />

    <FormInput
      :model-value="props.newConfirmPassword"
      name="newConfirmPassword"
      type="password"
      :placeholder="t('placeholder.auth.new_confirm_password')"
      :error="props.errors?.newConfirmPassword"
      icon="Lock"
      @update:model-value="emit('update:new-confirm-password', $event)"
      @blur="emit('blur:new-confirm-password')"
    />
  </ElForm>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import FormInput from '../core/input/FormInput.vue';

const props = defineProps<{
  oldPassword: string;
  newPassword: string;
  newConfirmPassword: string;
  errors?: Record<string, string>;
}>();
const emit = defineEmits<{
  (e: 'update:old-password', value: string): void;
  (e: 'blur:old-password'): void;
  (e: 'update:new-password', value: string): void;
  (e: 'blur:new-password'): void;
  (e: 'update:new-confirm-password', value: string): void;
  (e: 'blur:new-confirm-password'): void;
}>();
const { t } = useI18n();
</script>
