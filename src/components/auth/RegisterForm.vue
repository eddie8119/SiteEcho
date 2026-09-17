<template>
  <ElForm>
    <FormInput
      :model-value="props.email"
      name="email"
      type="email"
      :placeholder="t('placeholder.auth.email')"
      :error="props.errors?.email"
      icon="Message"
      @update:model-value="emit('update:email', $event)"
      @blur="emit('blur:email')"
    />

    <FormInput
      :model-value="props.password"
      name="password"
      type="password"
      :placeholder="t('placeholder.auth.password')"
      :error="props.errors?.password"
      icon="Lock"
      @update:model-value="emit('update:password', $event)"
      @blur="emit('blur:password')"
    />

    <FormInput
      :model-value="props.confirmPassword"
      name="confirmPassword"
      type="password"
      :placeholder="t('placeholder.auth.confirm_password')"
      :error="props.errors?.confirmPassword"
      icon="Lock"
      @update:model-value="emit('update:confirmPassword', $event)"
      @blur="emit('blur:confirmPassword')"
    />

    <router-link to="/auth/login">
      <p class="mb-2 text-sm">{{ t('link.back_to_login') }}</p>
    </router-link>
    <SsoSection @sso-login="emit('sso-login', $event)" />
  </ElForm>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import FormInput from '../core/input/FormInput.vue';

import type { SsoProvider } from '@/constants/provider';

import SsoSection from '@/components/auth/SsoSection.vue';

const props = defineProps<{
  email: string;
  password: string;
  confirmPassword: string;
  errors?: Record<string, string>;
}>();
const emit = defineEmits<{
  (e: 'update:email', value: string): void;
  (e: 'update:password', value: string): void;
  (e: 'update:confirmPassword', value: string): void;
  (e: 'blur:name'): void;
  (e: 'blur:email'): void;
  (e: 'blur:password'): void;
  (e: 'blur:confirmPassword'): void;
  (e: 'sso-login', provider: SsoProvider): void;
}>();
const { t } = useI18n();
</script>
