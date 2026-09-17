<template>
  <div class="flex h-full w-full flex-col gap-2">
    <!-- Filter Tabs - Fixed at top -->
    <div class="sticky top-0 z-10 flex w-full flex-col gap-2">
      <!-- First PillTab: Uncategorized -->
      <FullWidthPillTab
        v-if="getCategoryCount(UNCATEGORIZED_FILTER) > 0"
        :model-value="selectedFilter"
        :tabs="uncategorizedTabList"
        @update:model-value="selectedFilter = $event"
      >
        <template #item="{ tab }">{{ tab.label }}（{{ getCategoryCount(tab.value) }}）</template>
      </FullWidthPillTab>
      <!-- Second PillTab: Status options -->
      <FullWidthPillTab
        :model-value="selectedFilter"
        :tabs="statusTabList"
        @update:model-value="selectedFilter = $event"
      >
        <template #item="{ tab }">{{ tab.label }}（{{ getCategoryCount(tab.value) }}）</template>
      </FullWidthPillTab>
    </div>

    <!-- Active Filters -->
    <TimelineActiveFilters
      :active-filters="activeFilters"
      :has-active-filters="hasActiveFilters"
      @remove-filter="handleRemoveFilter"
      @clear-all="handleClearAllFilters"
    />

    <!-- Photos List - Scrollable area -->
    <div class="flex-1 overflow-y-auto px-3 py-3">
      <div class="space-y-3">
        <PendingPhotoItem
          v-for="(photo, index) in filteredPhotos"
          :key="photo.id"
          :photo="photo"
          :show-swipe-hint="showSwipeHint && index === 0"
          :force-open-bottom-sheet="openBottomSheetForId === photo.id"
          @mark-resolved="handleMarkAsResolved(photo.id)"
          @mark-resolved-with-after-photo="handleMarkAsResolvedWithAfterPhoto(photo.id)"
          @update-pending-type="handleUpdatePendingType(photo.id, $event)"
          @space-click="handleSpaceClick"
          @construction-click="handleConstructionClick"
          @show-all-constructions="handleShowAllConstructions"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import PendingPhotoItem from './PendingPhotoItem.vue';

import type { PhotoFilterType } from '@/types/filter';
import type { LocalPhoto } from '@/types/photo';

import FullWidthPillTab from '@/components/core/tab/FullWidthPillTab.vue';
import TimelineActiveFilters from '@/components/timeline/TimelineActiveFilters.vue';
import { useDebouncedPhotoSync } from '@/composables/useDebouncedPhotoSync';
import { PHOTO_PENDING_TAB_LIST, UNCATEGORIZED_FILTER } from '@/constants/tab';
import { PendingType } from '@/types/photo';
import { updatePhotoInIndexedDB } from '@/utils/indexedDB';

const props = defineProps<{
  openBottomSheetForId?: string | null;
  photos: LocalPhoto[];
}>();

const emit = defineEmits<{
  'mark-resolved': [photoId: string];
  'mark-resolved-with-after-photo': [photoId: string];
}>();

const { t } = useI18n();
const { triggerSync, flushSync } = useDebouncedPhotoSync();

const pendingTabList = computed(() => {
  return PHOTO_PENDING_TAB_LIST.map((tab) => ({
    ...tab,
    label: t(`tab.pendingPhotos.${tab.value}`),
  }));
});

const uncategorizedTabList = computed(() => {
  return pendingTabList.value.filter((tab) => tab.value === UNCATEGORIZED_FILTER);
});

const statusTabList = computed(() => {
  return pendingTabList.value.filter((tab) => tab.value !== UNCATEGORIZED_FILTER);
});

const selectedFilter = ref<string>(UNCATEGORIZED_FILTER);
const photosList = ref<LocalPhoto[]>(props.photos);
const showSwipeHint = ref(false);
const activeFilters = ref<Array<{ type: PhotoFilterType; value: string }>>([]);

const hasActiveFilters = computed(() => activeFilters.value.length > 0);

const isFollowUpPhoto = (photo: LocalPhoto) => Boolean(photo.parentPhotoId);

const isUncategorizedPendingPhoto = (photo: LocalPhoto) => {
  if (isFollowUpPhoto(photo)) return false;
  if (!photo.pendingType) return true;
  return ![PendingType.ISSUE, PendingType.FIX, PendingType.CHECK].includes(photo.pendingType);
};

const isPendingTypePhoto = (photo: LocalPhoto, categoryValue: string) => {
  return !isFollowUpPhoto(photo) && photo.pendingType === categoryValue;
};

const getCategoryCount = (categoryValue: string): number => {
  if (categoryValue === UNCATEGORIZED_FILTER) {
    // 未分類：計算所有不是 ISSUE、FIX 或 CHECK 的照片數量
    return photosList.value.filter(isUncategorizedPendingPhoto).length;
  }
  return photosList.value.filter((photo) => isPendingTypePhoto(photo, categoryValue)).length;
};

onMounted(() => {
  // 如果 Uncategorized 沒有項目，切換到 ISSUE 標籤
  if (getCategoryCount(UNCATEGORIZED_FILTER) === 0) {
    selectedFilter.value = PendingType.ISSUE;
  }

  // Show swipe hint animation on first load
  if (filteredPhotos.value.length > 0) {
    showSwipeHint.value = true;
    // Auto-hide hint after animation completes
    setTimeout(() => {
      showSwipeHint.value = false;
    }, 3000);
  }
});

onUnmounted(() => {
  void flushSync();
});

// 監聽 props.photos 的變化
watch(
  () => props.photos,
  (newPhotos) => {
    photosList.value = newPhotos;
  },
  { deep: true }
);

// 當 Uncategorized 沒有項目時，自動切換到 ISSUE 標籤
watch(
  () => getCategoryCount(UNCATEGORIZED_FILTER),
  (count) => {
    if (count === 0 && selectedFilter.value === UNCATEGORIZED_FILTER) {
      selectedFilter.value = PendingType.ISSUE;
    }
  }
);

const filteredPhotos = computed(() => {
  let photos: LocalPhoto[];

  if (selectedFilter.value === UNCATEGORIZED_FILTER) {
    // 未分類：顯示所有不是 ISSUE、FIX 或 CHECK 的照片
    photos = photosList.value.filter(isUncategorizedPendingPhoto);
  } else {
    photos = photosList.value.filter((photo) => isPendingTypePhoto(photo, selectedFilter.value));
  }

  // Apply space/construction filters
  if (activeFilters.value.length > 0) {
    photos = photos.filter((photo) => {
      return activeFilters.value.every((filter) => {
        if (filter.type === 'space') {
          return photo.space === filter.value;
        } else if (filter.type === 'construction') {
          return photo.constructions?.includes(filter.value);
        }
        return true;
      });
    });
  }

  return photos;
});

const handleUpdatePendingType = async (
  photoId: string,
  pendingType: PendingType | typeof UNCATEGORIZED_FILTER
) => {
  const photo = photosList.value.find((p) => p.id === photoId);
  if (!photo) return;

  // Update in local state immediately for UI responsiveness
  photo.pendingType = pendingType === UNCATEGORIZED_FILTER ? null : pendingType;

  try {
    // Update in IndexedDB and mark as dirty
    await updatePhotoInIndexedDB(photoId, {
      pendingType: pendingType === UNCATEGORIZED_FILTER ? null : pendingType,
      isDirty: true,
    });

    // Trigger debounced cloud sync for Layer 2/3 photos
    triggerSync(photoId, photo.syncLevel, photo.isEvidence);
  } catch (error) {
    console.error('Failed to update pending type:', error);
  }
};

const handleSpaceClick = (space: string) => {
  const existingFilter = activeFilters.value.find((f) => f.type === 'space');
  if (existingFilter && existingFilter.value === space) {
    activeFilters.value = activeFilters.value.filter((f) => f.type !== 'space');
  } else {
    activeFilters.value = activeFilters.value.filter((f) => f.type !== 'space');
    activeFilters.value = [...activeFilters.value, { type: 'space', value: space }];
  }
};

const handleConstructionClick = (construction: string) => {
  const existingFilter = activeFilters.value.find((f) => f.type === 'construction');
  if (existingFilter && existingFilter.value === construction) {
    activeFilters.value = activeFilters.value.filter((f) => f.type !== 'construction');
  } else {
    activeFilters.value = activeFilters.value.filter((f) => f.type !== 'construction');
    activeFilters.value = [...activeFilters.value, { type: 'construction', value: construction }];
  }
};

const handleRemoveFilter = (filterType: PhotoFilterType) => {
  activeFilters.value = activeFilters.value.filter((f) => f.type !== filterType);
};

const handleClearAllFilters = () => {
  activeFilters.value = [];
};

const handleShowAllConstructions = (_constructions: string[]) => {
  // Could be extended to show a dialog like ConstructionsDialog
  // For now, this is a placeholder
};

const handleMarkAsResolved = (photoId: string) => {
  emit('mark-resolved', photoId);
};

const handleMarkAsResolvedWithAfterPhoto = (photoId: string) => {
  emit('mark-resolved-with-after-photo', photoId);
};
</script>
