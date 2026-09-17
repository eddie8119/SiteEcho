<template>
  <div class="flex h-full w-full items-center justify-center">
    <div class="w-full max-w-[900px] md:p-4">
      <div
        class="flex flex-col overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,_rgba(255,255,255,0.95),_rgba(247,248,252,0.98))] shadow-[0_30px_80px_rgba(12,21,31,0.15)] md:flex-row md:items-stretch"
      >
        <div class="flex w-full md:max-w-[420px] md:flex-[0_0_420px] md:items-center">
          <AuthFormShell
            v-bind="props"
            :is-syncing="props.isSyncing"
            :sync-progress="props.syncProgress"
            class="min-h-[520px] w-full"
            @submit="emit('submit')"
          >
            <template #title>
              <slot name="title" />
            </template>

            <template #subtitle>
              <slot name="subtitle" />
            </template>

            <slot />

            <template #button-text>
              <slot name="button-text" />
            </template>
          </AuthFormShell>
        </div>

        <div class="relative hidden flex-1 md:block" aria-hidden="true">
          <div
            class="absolute inset-0 bg-cover bg-center opacity-80"
            :style="{ backgroundImage: `url('/Banner.jpg')` }"
          />
          <div class="absolute inset-0" :style="{ backgroundColor: 'rgba(255, 140, 0, 0.2)' }" />
        </div>
      </div>
    </div>
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
    isSyncing?: boolean;
    syncProgress?: { synced: number; total: number };
  }>(),
  {
    errorMessage: '',
    message: '',
    showLogo: true,
    isInvalid: false,
    showSubmitButton: true,
    isSyncing: false,
    syncProgress: () => ({ synced: 0, total: 0 }),
  }
);

const emit = defineEmits<{
  (e: 'submit'): void;
}>();
</script>

<style lang="scss" scoped></style>
