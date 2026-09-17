<template>
  <!-- Background Mask -->
  <div
    v-show="modelValue"
    class="bg-black/60 fixed inset-0 z-[80] backdrop-blur-sm transition-opacity duration-300"
    @click="emit('update:modelValue', false)"
  />

  <Teleport to="body">
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[90] flex flex-col justify-end"
        @click.self="emit('update:modelValue', false)"
      >
        <!-- Sheet -->
        <div
          class="relative z-10 flex max-h-[90vh] flex-col rounded-t-2xl bg-white px-6 pb-10 pt-4 shadow-xl"
        >
          <!-- Handle -->
          <div class="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-gray-200" />

          <div class="mb-6 flex flex-col items-center text-center">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-50">
              <svg
                v-if="reason === 'photo_count'"
                width="42"
                height="32"
                viewBox="0 0 42 32"
                fill="none"
                class="h-6 w-6"
                style="color: var(--color-brand-primary)"
              >
                <path
                  d="M40 4H31.7L30.5 1.2C30.2 0.500001 29.5 0 28.7 0H13.3C12.5 0 11.8 0.500001 11.5 1.2L10.3 4H2C0.9 4 0 4.9 0 6V30C0 31.1 0.9 32 2 32H40C41.1 32 42 31.1 42 30V6C42 4.9 41.1 4 40 4ZM5 11C3.9 11 3 10.1 3 9C3 7.9 3.9 7 5 7C6.1 7 7 7.9 7 9C7 10.1 6.1 11 5 11ZM21 28C15.5 28 11 23.5 11 18C11 12.5 15.5 8 21 8C26.5 8 31 12.5 31 18C31 23.5 26.5 28 21 28ZM29 18C29 22.4 25.4 26 21 26C16.6 26 13 22.4 13 18C13 13.6 16.6 10 21 10C25.4 10 29 13.6 29 18Z"
                  fill="currentColor"
                />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="h-6 w-6"
                style="color: var(--color-brand-primary)"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>

            <template v-if="reason === 'photo_count'">
              <H2Title
                :title="t('auth.register_prompt.photo_count_title', { count: photoCount })"
              />
            </template>

            <template v-else-if="reason === 'export_report'">
              <h2 class="mb-2 text-xl font-bold text-gray-900">
                {{ t('auth.register_prompt.export_report_title') }}
              </h2>
              <p class="text-gray-500">
                {{ t('auth.register_prompt.export_report_description') }}
              </p>
            </template>

            <template v-else-if="reason === 'follow_up_photo'">
              <h2 class="mb-2 text-xl font-bold text-gray-900">
                {{ t('auth.register_prompt.follow_up_photo_title') }}
              </h2>
              <p class="text-gray-500">
                {{ t('auth.register_prompt.follow_up_photo_description') }}
              </p>
            </template>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <TextButton variant="primary" size="md" full-width @click="emit('login')">
              {{ t('auth.register_prompt.login_button') }}
            </TextButton>

            <button
              class="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
              @click="emit('update:modelValue', false)"
            >
              {{ t('auth.register_prompt.cancel_button') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import H2Title from '@/components/core/title/H2Title.vue';

defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  login: [];
}>();

const { t } = useI18n();

interface Props {
  modelValue: boolean;
  reason: 'photo_count' | 'export_report' | 'follow_up_photo';
  photoCount: number;
}
</script>

<style scoped>
.sheet-slide-enter-active,
.sheet-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sheet-slide-enter-from,
.sheet-slide-leave-to {
  transform: translateY(100%);
}
</style>
