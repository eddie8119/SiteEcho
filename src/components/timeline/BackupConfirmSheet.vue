<template>
  <!-- Background Mask -->
  <div
    v-show="modelValue"
    class="bg-black/60 fixed inset-0 z-[60] backdrop-blur-sm transition-opacity duration-300"
    @click="emit('update:modelValue', false)"
  />

  <Teleport to="body">
    <Transition name="sheet-slide">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-[70] flex flex-col justify-end"
        @click.self="emit('update:modelValue', false)"
      >
        <!-- Sheet -->
        <div
          class="relative z-10 flex max-h-[90vh] flex-col rounded-t-2xl bg-white px-6 pb-10 pt-4 shadow-xl"
        >
          <!-- Handle -->
          <div class="mx-auto mb-6 h-1.5 w-12 shrink-0 rounded-full bg-gray-200" />

          <div class="mb-6 flex flex-col items-center text-center">
            <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
              <span
                class="icon-mask h-6 w-6 bg-blue-600"
                :style="{
                  WebkitMaskImage: `url(${PhotosIcon})`,
                  maskImage: `url(${PhotosIcon})`,
                }"
              />
            </div>

            <h2 class="mb-2 text-xl font-bold text-gray-900">
              {{ t('sheet.backupConfirm.title', { count: photoCount }) }}
            </h2>
            <p class="text-gray-500">
              {{ t('sheet.backupConfirm.estimatedSize') }}
              <span class="font-bold text-gray-900">{{ estimatedSize }}</span>
              {{ t('sheet.backupConfirm.cloudSpace') }}<br />
              {{ t('sheet.backupConfirm.continue') }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex flex-col gap-3">
            <TextButton variant="primary" size="md" full-width @click="emit('confirm')">
              {{ t('sheet.backupConfirm.confirmBackup') }}
            </TextButton>

            <button
              class="w-full py-3 text-sm font-medium text-gray-500 hover:text-gray-700"
              @click="emit('update:modelValue', false)"
            >
              {{ t('sheet.backupConfirm.cancel') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import PhotosIcon from '@/assets/icons/Photos.svg';
import TextButton from '@/components/core/button/TextButton.vue';

interface Props {
  modelValue: boolean;
  photoCount: number;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
}>();

const { t } = useI18n();

const estimatedSize = computed(() => {
  // Assume average 0.7MB per photo for backup
  const sizeMB = props.photoCount * 0.7;
  if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(0)} KB`;
  return `${sizeMB.toFixed(1)} MB`;
});
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

.icon-mask {
  display: inline-block;
  background-repeat: no-repeat;
  background-position: center;
  background-size: contain;
}
</style>
