<template>
  <ElForm>
    <FormInput
      :model-value="props.newPassword"
      name="newPassword"
      type="password"
      :placeholder="t('placeholder.auth.new_password')"
      :error="props.errors?.newPassword"
      icon="Lock"
      @update:model-value="emit('update:newPassword', $event)"
      @blur="emit('blur:newPassword')"
    />

    <FormInput
      :model-value="props.newConfirmPassword"
      name="newConfirmPassword"
      type="password"
      :placeholder="t('placeholder.auth.new_confirm_password')"
      :error="props.errors?.newConfirmPassword"
      icon="Lock"
      @update:model-value="emit('update:newConfirmPassword', $event)"
      @blur="emit('blur:newConfirmPassword')"
    />

    <router-link v-if="authStore.isAuthenticated" to="/">
      <p class="mb-2 text-sm">{{ t('link.back_to_home') }}</p>
    </router-link>
  </ElForm>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import FormInput from '../core/input/FormInput.vue';

import { useAuthStore } from '@/stores/useAuthStore';

const props = defineProps<{
  newPassword: string;
  newConfirmPassword: string;
  errors?: Record<string, string>;
  errorMessage?: string;
}>();
const emit = defineEmits<{
  (e: 'update:newPassword', value: string): void;
  (e: 'blur:newPassword'): void;
  (e: 'update:newConfirmPassword', value: string): void;
  (e: 'blur:newConfirmPassword'): void;
}>();
const { t } = useI18n();
const authStore = useAuthStore();
</script>
