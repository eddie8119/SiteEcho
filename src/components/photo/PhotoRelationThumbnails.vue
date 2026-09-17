<template>
  <div class="flex items-center gap-1">
    <div v-for="item in displayItems" :key="item.key" class="relative">
      <component
        :is="interactive ? 'button' : 'div'"
        :type="interactive ? 'button' : undefined"
        class="relative overflow-hidden rounded-md border border-white/60 bg-gray-100 shadow-sm"
        :class="sizeClasses.container"
        :title="item.title"
        @click="interactive && emit('select', item.photo)"
      >
        <img :src="item.url" :alt="item.title" class="h-full w-full object-cover" />
        <span
          v-if="item.index === 0 && label"
          class="bg-black/60 absolute left-0 top-0 rounded-br px-1 py-0.5 text-[9px] font-semibold text-white"
        >
          {{ label }}
        </span>
      </component>

      <button
        v-if="deletable"
        type="button"
        class="bg-black/70 absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white shadow-sm transition-colors hover:bg-red-600"
        :aria-label="removeLabel"
        :title="removeLabel"
        @click.stop="handleRemoveClick(item.photo)"
      >
        ×
      </button>
    </div>

    <span
      v-if="showCount && remainingCount > 0"
      class="bg-black/65 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm"
    >
      +{{ remainingCount }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

type PhotoLike = LocalPhoto | PhotoRecord;

type SizeVariant = 'sm' | 'md';

interface DisplayItem {
  key: string;
  url: string;
  title: string;
  photo: PhotoLike;
  index: number;
}

const props = withDefaults(
  defineProps<{
    photos: PhotoLike[];
    maxCount?: number;
    size?: SizeVariant;
    interactive?: boolean;
    showCount?: boolean;
    label?: string;
    deletable?: boolean;
    removeLabel?: string;
  }>(),
  {
    maxCount: 3,
    size: 'sm',
    interactive: true,
    showCount: true,
    label: '',
    deletable: false,
    removeLabel: 'Delete',
  }
);

const emit = defineEmits<{
  select: [photo: PhotoLike];
  remove: [photo: PhotoLike];
}>();

const objectUrls = ref<string[]>([]);
const displayItems = ref<DisplayItem[]>([]);

const sizeClasses = computed(() => {
  if (props.size === 'md') {
    return {
      container: 'h-14 w-14',
    };
  }

  return {
    container: 'h-8 w-8',
  };
});

const resolveUrl = (photo: PhotoLike) => {
  if ('file' in photo) {
    return URL.createObjectURL(photo.file);
  }
  return photo.thumbnailUrl || photo.imageUrl;
};

const rebuildItems = () => {
  objectUrls.value.forEach((url) => URL.revokeObjectURL(url));
  objectUrls.value = [];

  displayItems.value = props.photos.slice(0, props.maxCount).map((photo, index) => {
    const url = resolveUrl(photo);
    if ('file' in photo) {
      objectUrls.value.push(url);
    }

    return {
      key: `${photo.id}-${index}`,
      url,
      title: photo.constructions?.[0] || photo.space || photo.id,
      photo,
      index,
    };
  });
};

watch(
  () => [props.photos, props.maxCount],
  () => {
    rebuildItems();
  },
  { immediate: true, deep: true }
);

onBeforeUnmount(() => {
  objectUrls.value.forEach((url) => URL.revokeObjectURL(url));
});

const handleRemoveClick = (photo: PhotoLike) => {
  emit('remove', photo);
};

const remainingCount = computed(() => Math.max(props.photos.length - props.maxCount, 0));
</script>
