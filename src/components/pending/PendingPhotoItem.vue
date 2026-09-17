<template>
  <div
    class="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 transition-all duration-200"
    :class="[{ 'opacity-0': isFadingOut }, showSwipeHint && 'animate-swipe-hint']"
    @touchstart="handleTouchStart"
    @touchend="handleTouchEnd"
    @click="handleCardClick"
  >
    <!-- Thumbnail -->
    <div class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-200">
      <img
        :src="photoUrl"
        :alt="photo.constructions?.[0] || t('pending.item.altPhoto')"
        class="h-full w-full object-cover"
      />
    </div>

    <!-- Info -->
    <div class="min-w-0 flex-1">
      <p class="text-sm font-medium text-gray-900">
        {{ photo.note.slice(0, 15) }}
      </p>
      <p class="text-xs text-gray-500">
        {{
          photo.takenAt
            ? formatDateTimeToMinutes(photo.takenAt) + formatDateTimeWithDayNote(photo.takenAt)
            : ''
        }}
      </p>
      <div class="mt-1 flex flex-wrap gap-1">
        <button
          v-if="photo.space"
          class="inline-flex items-center gap-0.5 whitespace-nowrap rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 hover:bg-slate-200"
          @click.stop="emit('space-click', photo.space)"
        >
          <img src="@/assets/icons/Location.png" alt="Location" class="h-4 w-4" />
          {{ truncatedSpace }}
        </button>
        <template v-if="photo.constructions && photo.constructions.length > 0">
          <button
            class="inline-flex items-center gap-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-xs text-brand-primary hover:bg-orange-100"
            @click.stop="emit('construction-click', photo.constructions[0])"
          >
            🔧 {{ photo.constructions[0] }}
          </button>
          <button
            v-if="photo.constructions.length > 1"
            class="inline-flex items-center gap-0.5 rounded bg-orange-50 px-1.5 py-0.5 text-xs text-brand-primary hover:bg-orange-200"
            @click.stop="emit('show-all-constructions', photo.constructions)"
          >
            +{{ photo.constructions.length - 1 }}...
          </button>
        </template>
      </div>
    </div>

    <!-- Actions -->
    <div class="flex flex-shrink-0 items-center gap-2">
      <!-- Edit Button (⋯) -->
      <button
        class="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100 active:bg-gray-200"
        title="{{ t('pending.item.editPhoto') }}"
        @click.stop="navigateToEdit"
      >
        <span class="text-lg font-medium text-brand-primary">⋯</span>
      </button>
    </div>
  </div>

  <!-- Bottom Sheet Menu -->
  <Teleport to="body">
    <div
      v-if="showBottomSheet"
      class="bg-black/50 fixed inset-0 z-40"
      @click="showBottomSheet = false"
    />
    <div
      v-if="showBottomSheet"
      class="panel-color-difference fixed bottom-0 left-0 right-0 z-[50] rounded-t-2xl p-3 shadow-lg"
      @click.stop
    >
      <div class="mx-auto max-w-sm space-y-3">
        <p class="text-center text-sm font-medium text-gray-700">
          {{ t('pending.item.selectStatus') }}
        </p>
        <div class="grid grid-cols-3 gap-2">
          <GroupButton
            v-for="button in pendingTypeButtons"
            :key="button.type"
            @click="updatePendingType(button.type)"
          >
            {{ button.label }}
          </GroupButton>
        </div>
        <div class="flex gap-2">
          <TextButton
            v-for="button in resolveButtons"
            :key="button.label"
            variant="primary"
            class="!border-green-500 !bg-green-50 !text-green-700 hover:!bg-green-100"
            size="md"
            :full-width="true"
            @click="button.handler"
          >
            {{ button.label }}
          </TextButton>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import type { LocalPhoto } from '@/types/photo';

import GroupButton from '@/components/core/button/GroupButton.vue';
import TextButton from '@/components/core/button/TextButton.vue';
import { useDeviceDetection } from '@/composables/useDeviceDetection';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { PendingType } from '@/types/photo';
import { formatDateTimeToMinutes, formatDateTimeWithDayNote } from '@/utils/date';

const props = defineProps<{
  photo: LocalPhoto;
  showSwipeHint?: boolean;
  forceOpenBottomSheet?: boolean;
}>();

const emit = defineEmits({
  'mark-resolved': () => true,
  'mark-resolved-with-after-photo': () => true,
  'update-pending-type': (_pendingType: PendingType) => true,
  'space-click': (_space: string) => true,
  'construction-click': (_construction: string) => true,
  'show-all-constructions': (_constructions: string[]) => true,
});

const router = useRouter();
const { t } = useI18n();
const showBottomSheet = ref(false);
const isFadingOut = ref(false);
let touchStartX = 0;

const { isDesktop } = useDeviceDetection();
const { checkFollowUpTrigger, consumeFollowUpPhoto } = useRegistrationFlow();

const pendingTypeButtons = computed(() => [
  { type: PendingType.ISSUE, label: t('tab.pendingPhotos.issue') },
  { type: PendingType.FIX, label: t('tab.pendingPhotos.fix') },
  { type: PendingType.CHECK, label: t('tab.pendingPhotos.check') },
]);

const resolveButtons = computed(() => [
  { label: t('pending.item.resolve'), handler: markAsResolved },
  { label: t('pending.item.resolve_and_add_after_photo'), handler: markAsResolvedWithAfterPhoto },
]);

// Watch for forceOpenBottomSheet prop to open bottom sheet (undo flow)
watch(
  () => props.forceOpenBottomSheet,
  (shouldOpen) => {
    if (shouldOpen) {
      showBottomSheet.value = true;
    }
  },
  { immediate: true }
);

const photoUrl = computed(() => {
  return URL.createObjectURL(props.photo.file);
});

const truncatedSpace = computed(() => {
  if (!props.photo.space) return '';
  const space = props.photo.space;
  if (isDesktop.value) return space;
  const hasChinese = /[\u4e00-\u9fff]/.test(space);
  const maxLength = hasChinese ? 2 : 4;
  if (space.length <= maxLength) return space;
  return space.slice(0, maxLength) + '.';
});

const handleTouchStart = (event: TouchEvent) => {
  touchStartX = event.touches[0].clientX;
};

const handleTouchEnd = (event: TouchEvent) => {
  const touchEndX = event.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;

  // 判斷是否為滑動（水平移動超過 50px）
  if (Math.abs(diff) > 50) {
    event.preventDefault(); // 防止觸發 click 事件

    const typeOrder: PendingType[] = [PendingType.ISSUE, PendingType.CHECK, PendingType.FIX];
    const currentIndex = typeOrder.indexOf(props.photo.pendingType as PendingType);
    let nextIndex: number;

    // Swipe left (positive diff) -> 正向循環 (ISSUE → CHECK → FIX)
    if (diff > 50) {
      nextIndex = (currentIndex + 1) % typeOrder.length;
    }
    // Swipe right (negative diff) -> 反向循環 (FIX → CHECK → ISSUE)
    else if (diff < -50) {
      nextIndex = (currentIndex - 1 + typeOrder.length) % typeOrder.length;
    } else {
      return;
    }

    updatePendingType(typeOrder[nextIndex]);
  }
  // 如果不是滑動，不處理點擊（讓按鈕自己處理）
};

const handleCardClick = () => {
  showBottomSheet.value = true;
};

const navigateToEdit = () => {
  router.push({ name: 'photo-edit', params: { id: props.photo.id }, query: { from: 'pending' } });
};

const updatePendingType = async (pendingType: PendingType) => {
  showBottomSheet.value = false;
  isFadingOut.value = true;

  // Emit update event
  emit('update-pending-type', pendingType);

  // Wait for fade-out animation to complete
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Reset fade-out state so card can reappear in "全部" tab
  isFadingOut.value = false;
};

const markAsResolved = async () => {
  showBottomSheet.value = false;
  isFadingOut.value = true;

  // Emit mark-resolved event to change photo status to RESOLVED
  emit('mark-resolved');

  // Wait for fade-out animation to complete
  await new Promise((resolve) => setTimeout(resolve, 200));

  // Reset fade-out state
  isFadingOut.value = false;
};

const markAsResolvedWithAfterPhoto = async () => {
  const canProceed = checkFollowUpTrigger();
  if (!canProceed || !(await consumeFollowUpPhoto())) {
    return;
  }

  showBottomSheet.value = false;
  isFadingOut.value = true;

  emit('mark-resolved-with-after-photo');

  await new Promise((resolve) => setTimeout(resolve, 200));

  isFadingOut.value = false;
};
</script>

<style scoped>
div {
  transition: opacity 0.2s ease-out;
}

@keyframes swipe-hint {
  0% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-12px);
  }
  50% {
    transform: translateX(0);
  }
  75% {
    transform: translateX(12px);
  }
  100% {
    transform: translateX(0);
  }
}

.animate-swipe-hint {
  animation: swipe-hint 2s ease-in-out infinite;
}
</style>
