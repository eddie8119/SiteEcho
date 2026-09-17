<template>
  <ElForm>
    <FormInput
      :model-value="props.username"
      name="username"
      type="text"
      :placeholder="t('placeholder.auth.name')"
      :error="props.errors?.username"
      @update:model-value="emit('update:username', $event)"
      @blur="emit('blur:username')"
    />
  </ElForm>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import FormInput from '../core/input/FormInput.vue';

const props = defineProps<{
  username: string;
  errors?: Record<string, string>;
}>();
const emit = defineEmits<{
  (e: 'update:username', value: string): void;
  (e: 'blur:username'): void;
}>();
const { t } = useI18n();
</script>
