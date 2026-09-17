<template>
  <div
    v-if="parentPhotoId"
    class="bg-black/80 safe-area-top-md fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-4 py-3 backdrop-blur"
  >
    <TextButton
      variant="ghost"
      size="lg"
      class="!text-white hover:!text-gray-300"
      @click="handleCancel"
    >
      {{ t('camera.take_photo.cancel') }}
    </TextButton>
    <div class="absolute left-1/2 -translate-x-1/2">
      <div class="rounded-lg bg-orange-50 px-3 py-1.5 font-medium text-orange-700">
        {{ t('camera.take_photo.follow_up_mode') }}
      </div>
    </div>
    <TextButton
      v-if="capturedPhotoIds.length > 0"
      variant="ghost"
      size="lg"
      class="!text-white hover:!text-gray-300"
      @click="handleDone"
    >
      {{ t('camera.take_photo.done') }}
    </TextButton>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';

interface Props {
  parentPhotoId: string | null;
  capturedPhotoIds: string[];
}

defineProps<Props>();

const emit = defineEmits<{
  cancel: [];
  done: [];
}>();

const { t } = useI18n();

const handleCancel = () => {
  emit('cancel');
};

const handleDone = () => {
  emit('done');
};
</script>
