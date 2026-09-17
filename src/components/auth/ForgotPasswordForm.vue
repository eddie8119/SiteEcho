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

    <router-link to="/auth/login">
      <p class="mb-2 text-sm">{{ t('link.back_to_login') }}</p>
    </router-link>
  </ElForm>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import FormInput from '../core/input/FormInput.vue';

const props = defineProps<{
  email: string;
  errors?: Record<string, string>;
}>();
const emit = defineEmits<{
  (e: 'update:email', value: string): void;
  (e: 'blur:email'): void;
}>();
const { t } = useI18n();
</script>
