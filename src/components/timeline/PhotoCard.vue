<template>
  <div
    class="cursor-pointer overflow-hidden bg-white"
    @click="emit('click')"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @mousedown="emit('mousedown')"
    @mouseup="emit('mouseup')"
  >
    <!-- Thumbnail Container -->
    <div class="group relative aspect-square bg-gray-200">
      <!-- Photo Image -->
      <img
        :src="photoUrl"
        :alt="photo.constructions?.[0] || t('photo.card.alt_photo')"
        class="h-full w-full object-cover"
        style="-webkit-touch-callout: none"
        @contextmenu.prevent
      />

      <!-- Selection Checkbox (Top-Right) -->
      <div v-if="isMultiSelectMode" class="absolute right-2 top-2">
        <div
          class="flex h-6 w-6 items-center justify-center rounded-full border-2"
          :class="isSelected ? 'border-orange-500 bg-orange-500' : 'border-gray-300 bg-white'"
        >
          <svg v-if="isSelected" class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>

      <!-- Sync Status Indicator (Bottom-Right) -->
      <div v-if="!isMultiSelectMode && showSyncStatus !== false" class="absolute bottom-1 right-1">
        <button
          class="flex h-6 w-6 items-center justify-center rounded-full shadow-sm backdrop-blur-sm transition-colors"
          :class="photo.isEvidence ? 'bg-brand-primary text-white' : 'bg-white/70 text-gray-400'"
          :title="
            photo.syncLevel === PhotoSyncLevel.THUMBNAIL
              ? t('photo.card.upgrade_to_evidence_thumbnail')
              : t('photo.card.upgrade_to_evidence')
          "
          @click.stop="emit('toggle-evidence', photo)"
        >
          <span v-if="photo.syncLevel === PhotoSyncLevel.THUMBNAIL" class="text-[10px]">☁️</span>
          <svg v-else class="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        </button>
      </div>

      <!-- Status Indicator (Top-Right) -->
      <div v-if="!isMultiSelectMode" class="absolute right-1 top-1">
        <img
          v-if="photo.status === 'pending'"
          src="@/assets/icons/Caution.png"
          alt="Pending"
          class="h-6 w-6"
        />
        <div
          v-else-if="photo.status === 'resolved'"
          class="flex h-6 w-6 items-center justify-center rounded-full bg-green-500"
          :title="t('photo.problem_resolved')"
        >
          <svg class="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
        </div>
      </div>

      <!-- Follow-up Photo Thumbnails (Bottom-Left) -->
      <div
        v-if="!isMultiSelectMode && followUpPhotos && followUpPhotos.length > 0"
        class="bg-black/35 absolute bottom-1 left-1 rounded-lg px-1 py-1 shadow-sm backdrop-blur-sm"
      >
        <PhotoRelationThumbnails
          :photos="followUpPhotos"
          :max-count="1"
          :interactive="false"
          :show-count="true"
          size="sm"
        />
      </div>

      <!-- Note Preview (Top-Left) -->
      <div
        v-if="photo.note"
        class="bg-black/30 absolute left-1 top-1 z-10 max-w-[80px] cursor-help rounded px-1.5 py-0.5 backdrop-blur-sm"
        @mouseenter="showTooltip = true"
        @mouseleave="showTooltip = false"
        @touchstart="showTooltip = true"
        @touchend="showTooltip = false"
      >
        <span class="block truncate text-xs text-gray-300"> {{ photo.note.slice(0, 4) }}... </span>
        <Tooltip :text="photo.note" :visible="showTooltip" position="top" />
      </div>

      <!-- Remaining Days (Bottom) - for trash photos -->
      <div
        v-if="remainingDays !== undefined"
        class="absolute bottom-0 left-0 w-full rounded-b bg-gray-600/50 px-2 py-1"
      >
        <p class="text-center text-xs text-white">
          {{ t('photo.card.remaining_days', { days: remainingDays }) }}
        </p>
      </div>
    </div>

    <!-- Info Area Below Thumbnail -->
    <div class="flex flex-col gap-2 p-1.5">
      <div class="flex items-center justify-between">
        <p class="text-xs text-gray-500">
          <img src="@/assets/icons/Clock.png" alt="Clock" class="inline-block h-3 w-3" />
          {{ formatShortTime(photo.takenAt) }}
        </p>
        <button
          v-if="photo.space"
          class="inline-flex cursor-pointer items-center gap-0.5 whitespace-nowrap rounded border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 shadow transition-all active:translate-y-px active:bg-slate-300 active:shadow-inner"
          @click.stop="emit('space-click', photo.space)"
        >
          <img src="@/assets/icons/Location.png" alt="Location" class="h-4 w-4" />
          {{ truncatedSpace }}
        </button>
      </div>
      <div class="flex flex-wrap gap-1">
        <template v-if="photo.constructions && photo.constructions.length > 0">
          <button
            class="inline-flex cursor-pointer items-center gap-0.5 rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-xs text-brand-primary shadow transition-all active:translate-y-px active:bg-orange-200 active:shadow-inner"
            @click.stop="emit('construction-click', photo.constructions[0])"
          >
            🔧 {{ photo.constructions[0] }}
          </button>
          <button
            v-if="photo.constructions.length > 1"
            class="inline-flex cursor-pointer items-center gap-0.5 rounded border border-orange-100 bg-orange-50 px-1.5 py-0.5 text-xs text-brand-primary shadow transition-all active:translate-y-px active:bg-orange-200 active:shadow-inner"
            @click.stop="emit('show-all-constructions', photo.constructions)"
          >
            +{{ photo.constructions.length - 1 }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

import PhotoRelationThumbnails from '@/components/photo/PhotoRelationThumbnails.vue';
import Tooltip from '@/components/ui/Tooltip.vue';
import { useDeviceDetection } from '@/composables/useDeviceDetection';
import { PhotoSyncLevel } from '@/types/photo';
import { formatShortTime } from '@/utils/date';

const props = defineProps<{
  photo: LocalPhoto | PhotoRecord;
  isSelected: boolean;
  isMultiSelectMode: boolean;
  remainingDays?: string;
  showSyncStatus?: boolean;
  followUpPhotos?: Array<LocalPhoto | PhotoRecord>;
}>();

const emit = defineEmits({
  click: () => true,
  touchstart: () => true,
  touchend: () => true,
  mousedown: () => true,
  mouseup: () => true,
  'space-click': (_space: string) => true,
  'construction-click': (_construction: string) => true,
  'show-all-constructions': (_constructions: string[]) => true,
  'toggle-evidence': (_photo: LocalPhoto | PhotoRecord) => true,
});

const { t } = useI18n();

// Touch movement detection to prevent long-press during scroll
const MOVEMENT_THRESHOLD = 10;
const touchStartX = ref(0);
const touchStartY = ref(0);
const hasMoved = ref(false);

const handleTouchStart = (e: TouchEvent) => {
  touchStartX.value = e.touches[0].clientX;
  touchStartY.value = e.touches[0].clientY;
  hasMoved.value = false;
  emit('touchstart');
};

const handleTouchMove = (e: TouchEvent) => {
  const deltaX = Math.abs(e.touches[0].clientX - touchStartX.value);
  const deltaY = Math.abs(e.touches[0].clientY - touchStartY.value);

  if (deltaX > MOVEMENT_THRESHOLD || deltaY > MOVEMENT_THRESHOLD) {
    hasMoved.value = true;
    // Emit touchend early to cancel long-press timer
    emit('touchend');
  }
};

const handleTouchEnd = () => {
  if (!hasMoved.value) {
    emit('touchend');
  }
  hasMoved.value = false;
};

const isRemote = computed(() => 'imageUrl' in props.photo || 'thumbnailUrl' in props.photo);

const photoUrl = computed(() => {
  if (isRemote.value) {
    const remote = props.photo as PhotoRecord;
    // Always use thumbnail if available for performance
    return remote.thumbnailUrl || remote.imageUrl;
  }
  return URL.createObjectURL((props.photo as LocalPhoto).file);
});

const showTooltip = ref(false);

const { isDesktop } = useDeviceDetection();

const truncatedSpace = computed(() => {
  if (!props.photo.space) return '';
  const space = props.photo.space;
  // Return original string if device is desktop (computer)
  if (isDesktop.value) return space;
  // Check if text contains Chinese characters
  const hasChinese = /[\u4e00-\u9fff]/.test(space);
  const maxLength = hasChinese ? 2 : 4;
  if (space.length <= maxLength) return space;
  return space.slice(0, maxLength) + '.';
});
</script>
