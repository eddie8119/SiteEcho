<template>
  <ElDialog
    v-model="dialogVisible"
    :title="t('photo.comparison.title')"
    :width="props.width"
    :close-on-click-modal="true"
    :close-on-press-escape="true"
    :show-close="true"
    center
    align-center
    @close="onClose"
  >
    <div class="mb-3 text-xs text-gray-500">{{ t('photo.comparison.description') }}</div>

    <div class="grid gap-3 md:grid-cols-2">
      <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-700">{{ props.originalLabel }}</span>
          <span class="text-xs text-gray-500">{{ originalMeta }}</span>
        </div>
        <div class="bg-black overflow-hidden rounded-lg">
          <img
            :src="originalUrl"
            :alt="props.originalLabel"
            class="max-h-[65vh] w-full object-contain"
          />
        </div>
      </div>

      <div class="rounded-xl border border-gray-200 bg-gray-50 p-3">
        <div class="mb-2 flex items-center justify-between">
          <span class="text-sm font-semibold text-gray-700">{{ props.compareLabel }}</span>
          <span class="text-xs text-gray-500">{{ compareMeta }}</span>
        </div>
        <div class="bg-black overflow-hidden rounded-lg">
          <img
            :src="compareUrl"
            :alt="props.compareLabel"
            class="max-h-[65vh] w-full object-contain"
          />
        </div>
      </div>
    </div>
  </ElDialog>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

type PhotoLike = LocalPhoto | PhotoRecord;

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    originalPhoto: PhotoLike | null;
    comparePhoto: PhotoLike | null;
    originalLabel?: string;
    compareLabel?: string;
    width?: string;
  }>(),
  {
    originalLabel: '',
    compareLabel: '',
    width: '80vw',
  }
);

const emit = defineEmits(['update:modelValue', 'cancel']);

const { t } = useI18n();
const originalUrl = ref('');
const compareUrl = ref('');
const objectUrls = ref<string[]>([]);

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const resolveUrl = (photo: PhotoLike | null) => {
  if (!photo) return '';
  if ('file' in photo) {
    return URL.createObjectURL(photo.file);
  }
  return photo.thumbnailUrl || photo.imageUrl;
};

const originalMeta = computed(() => {
  if (!props.originalPhoto) return '';
  return props.originalPhoto.takenAt ? new Date(props.originalPhoto.takenAt).toLocaleString() : '';
});

const compareMeta = computed(() => {
  if (!props.comparePhoto) return '';
  return props.comparePhoto.takenAt ? new Date(props.comparePhoto.takenAt).toLocaleString() : '';
});

const rebuildUrls = () => {
  objectUrls.value.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.value = [];

  originalUrl.value = resolveUrl(props.originalPhoto);
  compareUrl.value = resolveUrl(props.comparePhoto);

  if (props.originalPhoto && 'file' in props.originalPhoto && originalUrl.value) {
    objectUrls.value.push(originalUrl.value);
  }
  if (props.comparePhoto && 'file' in props.comparePhoto && compareUrl.value) {
    objectUrls.value.push(compareUrl.value);
  }
};

watch(
  () => [props.modelValue, props.originalPhoto, props.comparePhoto],
  () => {
    rebuildUrls();
  },
  { immediate: true, deep: true }
);

const onClose = () => {
  emit('cancel');
  emit('update:modelValue', false);
};

onBeforeUnmount(() => {
  objectUrls.value.forEach((url) => URL.revokeObjectURL(url));
});
</script>
