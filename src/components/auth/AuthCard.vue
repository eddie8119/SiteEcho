<template>
  <div class="flex h-full w-full items-center justify-center">
    <AuthFormShell v-bind="props" @submit="emit('submit')">
      <template #title>
        <slot name="title" />
      </template>

      <slot />

      <template #button-text>
        <slot name="button-text" />
      </template>
    </AuthFormShell>
  </div>
</template>

<script setup lang="ts">
import AuthFormShell from '@/components/auth/AuthFormShell.vue';

const props = withDefaults(
  defineProps<{
    errorMessage?: string | null;
    message?: string | null;
    loading?: boolean;
    showLogo?: boolean;
    isInvalid?: boolean;
    showSubmitButton?: boolean;
  }>(),
  {
    errorMessage: '',
    message: '',
    showLogo: true,
    isInvalid: false,
    showSubmitButton: true,
  }
);

const emit = defineEmits<{
  (e: 'submit'): void;
}>();
</script>

<style lang="scss" scoped></style>
