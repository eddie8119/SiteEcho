<template>
  <BasicEditDialog
    v-model="dialogVisible"
    :title="title"
    :show-footer-button="false"
    @cancel="handleCancel"
  >
    <div class="flex flex-row items-center justify-center gap-3">
      <button
        class="inline-flex items-center justify-center rounded-full bg-brand-primary p-4 transition-all duration-200 hover:bg-brand-secondary"
        @click="handleSelectCamera"
      >
        <img :src="photoIcon" class="h-8 w-8" />
      </button>
      <span class="text-gray-600">or</span>
      <button
        class="inline-flex items-center justify-center rounded-full bg-brand-primary p-4 transition-all duration-200 hover:bg-brand-secondary"
        @click="handleSelectAlbum"
      >
        <img :src="uploadIcon" class="h-8 w-8" />
      </button>
    </div>
  </BasicEditDialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import photoIcon from '@/assets/icons/Photo.svg';
import uploadIcon from '@/assets/icons/Upload.svg';
import BasicEditDialog from '@/components/core/dialog/BasicEditDialog.vue';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    title?: string;
  }>(),
  {
    modelValue: false,
    title: '',
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'select-album': [];
  'select-camera': [];
  cancel: [];
}>();

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
});

const handleSelectAlbum = () => {
  emit('select-album');
  // Don't close dialog immediately - let parent handle it
};

const handleSelectCamera = () => {
  emit('select-camera');
  // Don't close dialog immediately - let parent handle it
};

const handleCancel = () => {
  emit('cancel');
};
</script>
