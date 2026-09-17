<template>
  <div class="flex flex-col gap-4">
    <!-- Photo Preview -->
    <div
      class="aspect-video cursor-pointer overflow-hidden rounded-lg"
      @click="showImagePreview = true"
    >
      <img
        :src="photoUrl"
        :alt="photo?.constructions?.[0] || 'photo'"
        class="h-full w-full object-contain"
      />
    </div>
    <!-- Time Info -->
    <div class="text-sm text-gray-600">
      <p>
        {{ t('photo.taken_at') }}{{ photo?.takenAt ? formatDateTimeToMinutes(photo.takenAt) : '' }}
      </p>
    </div>

    <!-- Evidence Chain (shown when resolved) -->
    <PhotoEvidenceChain
      :photo="photo"
      :parent-photo="parentPhoto"
      :related-photos="relatedPhotos"
      :current-resolved-at="currentResolvedAt"
      :on-add-follow-up="props.onAddFollowUp"
      :on-remove-related-photo="props.onRemoveRelatedPhoto"
      :on-generate-follow-up-report="props.onGenerateFollowUpReport"
      @add-follow-up="handleAddFollowUpPhoto"
      @remove-related-photo="handleRemoveFollowUpPhoto"
      @generate-follow-up-report="handleGenerateFollowUpReport"
      @open-parent-comparison="handleOpenParentComparison"
      @open-follow-up-comparison="handleOpenFollowUpComparison"
    />

    <PhotoComparisonModal
      v-model="showComparisonModal"
      :original-photo="comparisonOriginalPhoto"
      :compare-photo="comparisonComparePhoto"
      :original-label="comparisonOriginalLabel"
      :compare-label="comparisonCompareLabel"
    />

    <PhotoEditFields
      v-show="photo"
      :show-space-selection="showSpaceSelection"
      :show-pending-type-selection="showPendingTypeSelection"
      :initial-status="photo?.status"
      :initial-pending-type="photo?.pendingType"
      :initial-constructions="photo?.constructions || []"
      :initial-space="photo?.space"
      :initial-note="photo?.note"
      :initial-constructions-options="constructionsOptions"
      :initial-space-options="spaceOptions"
      @update:status="handleStatusUpdate"
      @update:pending-type="handlePendingTypeUpdate"
      @update:constructions="handleConstructionsUpdate"
      @update:space="handleSpaceUpdate"
      @update:note="handleNoteUpdate"
    />

    <hr class="my-2 border-gray-200" />

    <!-- Action Buttons -->
    <div class="flex gap-2">
      <TextButton variant="outline" full-width @click="showDeleteConfirm = true">
        {{ props.mode === 'create' ? t('button.discard') : t('button.delete') }}
      </TextButton>
      <TextButton variant="primary" full-width @click="handleConfirm">
        {{ t('button.save') }}
      </TextButton>
    </div>

    <!-- Delete Confirmation Dialog -->
    <BatchDeleteConfirmDialog
      v-if="isEvidencePhoto"
      v-model="showDeleteConfirm"
      :photos="props.photo ? [props.photo] : []"
      :is-single-photo="true"
      @confirm="handleConfirmDiscardWithAction"
    />
    <DeleteDialog
      v-else
      v-model="showDeleteConfirm"
      :target="
        props.mode === 'create' ? t('photo.dialog.this_photo') : t('photo.dialog.this_photo')
      "
      :subject="t('photo.dialog.photo')"
      :body-text="t('photo.dialog.cannot_undo')"
      @confirm="handleConfirmDiscard"
    />

    <!-- Image Preview Modal -->
    <ImagePreviewModal
      :show="showImagePreview"
      :image-url="photoUrl"
      :alt="photo?.constructions?.[0] || 'photo'"
      @close="showImagePreview = false"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import type { ConstructionOption, LocalPhoto, PhotoRecord, SpaceOption } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import BatchDeleteConfirmDialog from '@/components/core/dialog/BatchDeleteConfirmDialog.vue';
import DeleteDialog from '@/components/core/dialog/DeleteDialog.vue';
import ImagePreviewModal from '@/components/core/ImagePreviewModal.vue';
import PhotoComparisonModal from '@/components/photo/PhotoComparisonModal.vue';
import PhotoEditFields from '@/components/photo/PhotoEditFields.vue';
import PhotoEvidenceChain from '@/components/photo/PhotoEvidenceChain.vue';
import { EvidenceAction } from '@/composables/useTimelineMultiSelect';
import { LOCAL_STORAGE_KEYS } from '@/constants/localStorage';
import { DEFAULT_CONSTRUCTION_OPTIONS, DEFAULT_SPACE_OPTIONS } from '@/constants/material';
import { PendingType, PhotoStatus } from '@/types/photo';
import { formatDateTimeToMinutes } from '@/utils/date';

type PhotoLike = LocalPhoto | PhotoRecord;

const props = defineProps<{
  photo: LocalPhoto | null;
  parentPhoto?: PhotoLike | null;
  relatedPhotos?: PhotoLike[];
  showSpaceSelection?: boolean;
  showPendingTypeSelection?: boolean;
  mode?: 'create' | 'edit';
  onAddFollowUp?: () => void;
  onRemoveRelatedPhoto?: (photo: PhotoLike) => void;
  onGenerateFollowUpReport?: () => void;
  onDiscard?: (evidenceAction?: EvidenceAction) => void;
  onCancel?: () => void;
  onConfirm?: () => void;
}>();

const { t } = useI18n();

const constructionsOptions = ref<ConstructionOption[]>([]);
const spaceOptions = ref<SpaceOption[]>([]);
const showDeleteConfirm = ref(false);
const showImagePreview = ref(false);
const showComparisonModal = ref(false);
const comparisonOriginalPhoto = ref<PhotoLike | null>(null);
const comparisonComparePhoto = ref<PhotoLike | null>(null);
const comparisonOriginalLabel = ref('');
const comparisonCompareLabel = ref('');

// Local state for form data
const currentStatus = ref<PhotoStatus>(PhotoStatus.NORMAL);
const currentConstructions = ref<string[]>([]);
const currentSpace = ref<string | null>(null);
const currentNote = ref('');
const currentPendingType = ref<PendingType | null>(null);
const currentResolvedAt = ref<Date | undefined>(undefined);

const photoUrl = computed(() => {
  if (!props.photo) {
    return '';
  }

  return URL.createObjectURL(props.photo.file);
});

// Check if photo is evidence (Layer 2-3)
const isEvidencePhoto = computed(() => {
  if (!props.photo) return false;
  return props.photo.isEvidence;
});

const openComparison = (
  originalPhoto: PhotoLike | null,
  comparePhoto: PhotoLike | null,
  originalLabel: string,
  compareLabel: string
) => {
  if (!originalPhoto || !comparePhoto) return;

  comparisonOriginalPhoto.value = originalPhoto;
  comparisonComparePhoto.value = comparePhoto;
  comparisonOriginalLabel.value = originalLabel;
  comparisonCompareLabel.value = compareLabel;
  showComparisonModal.value = true;
};

const handleOpenParentComparison = () => {
  if (!props.photo || !props.parentPhoto) return;
  openComparison(
    props.parentPhoto,
    props.photo,
    t('photo.comparison.original'),
    t('photo.comparison.follow_up')
  );
};

const handleAddFollowUpPhoto = () => {
  props.onAddFollowUp?.();
};

const handleRemoveFollowUpPhoto = (photo: PhotoLike) => {
  props.onRemoveRelatedPhoto?.(photo);
};

const handleGenerateFollowUpReport = () => {
  props.onGenerateFollowUpReport?.();
};

const handleOpenFollowUpComparison = (photo: PhotoLike) => {
  if (!props.photo) return;
  openComparison(
    props.photo,
    photo,
    t('photo.comparison.original'),
    t('photo.comparison.follow_up')
  );
};

const handleConfirmDiscard = () => {
  props.onDiscard?.();
};

const handleConfirmDiscardWithAction = (payload: { evidenceAction: EvidenceAction }) => {
  props.onDiscard?.(payload.evidenceAction);
};

const handleConfirm = () => {
  props.onConfirm?.();
};

// Event handlers for PhotoEditFields
const handleStatusUpdate = (status: PhotoStatus) => {
  currentStatus.value = status;
  // When status changes to resolved, set resolvedAt to current time
  if (status === PhotoStatus.RESOLVED) {
    currentResolvedAt.value = new Date();
  } else {
    currentResolvedAt.value = undefined;
  }
};

const handlePendingTypeUpdate = (pendingType: PendingType | null) => {
  currentPendingType.value = pendingType;
};

const handleConstructionsUpdate = (constructions: string[]) => {
  currentConstructions.value = constructions;
};

const handleSpaceUpdate = (space: string | null) => {
  currentSpace.value = space;
};

const handleNoteUpdate = (note: string) => {
  currentNote.value = note;
};

const getFormData = () => {
  return {
    constructions: currentConstructions.value,
    space: currentSpace.value,
    status: currentStatus.value,
    pendingType: currentPendingType.value,
    note: currentNote.value,
    resolvedAt: currentResolvedAt.value,
  };
};

const resetForm = () => {
  currentConstructions.value = [];
  currentSpace.value = null;
  currentStatus.value = PhotoStatus.NORMAL;
  currentPendingType.value = null;
  currentNote.value = '';
  currentResolvedAt.value = undefined;
};

// Initialize options from localStorage
const initializeOptions = () => {
  const savedConstructions = localStorage.getItem(LOCAL_STORAGE_KEYS.CONSTRUCTIONS_OPTIONS);
  const savedSpaces = localStorage.getItem(LOCAL_STORAGE_KEYS.SPACE_OPTIONS);

  if (savedConstructions) {
    constructionsOptions.value = JSON.parse(savedConstructions);
  } else {
    constructionsOptions.value = DEFAULT_CONSTRUCTION_OPTIONS;
  }

  if (savedSpaces) {
    spaceOptions.value = JSON.parse(savedSpaces);
  } else {
    spaceOptions.value = DEFAULT_SPACE_OPTIONS;
  }
};

// Initialize options synchronously to ensure PhotoEditFields receives initial options
initializeOptions();

const cleanupPhotoUrl = () => {
  if (photoUrl.value) {
    URL.revokeObjectURL(photoUrl.value);
  }
};

// Cleanup blob URL when component is unmounted
onBeforeUnmount(() => {
  cleanupPhotoUrl();
});

// Reset form when photo changes
watch(
  () => props.photo,
  (newPhoto) => {
    showComparisonModal.value = false;
    comparisonOriginalPhoto.value = null;
    comparisonComparePhoto.value = null;
    comparisonOriginalLabel.value = '';
    comparisonCompareLabel.value = '';

    if (newPhoto) {
      currentStatus.value = newPhoto.status;
      currentConstructions.value = newPhoto.constructions || [];
      currentSpace.value = newPhoto.space;
      currentNote.value = newPhoto.note;
      currentPendingType.value = newPhoto.pendingType || null;
      currentResolvedAt.value = newPhoto.resolvedAt;
    } else {
      resetForm();
    }
  },
  { immediate: true, deep: true }
);

// Expose methods to parent
defineExpose({
  getFormData,
  resetForm,
  cleanupPhotoUrl,
});
</script>

<style scoped lang="scss">
textarea {
  resize: vertical;
}
</style>
