<template>
  <div
    v-if="editedPhoto"
    class="bg-black/50 fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
    @click="$emit('close')"
  >
    <div class="relative flex max-h-[95vh] w-full max-w-6xl flex-col" @click.stop>
      <button
        class="absolute -top-12 right-0 p-2 text-white/70 transition-colors hover:text-white"
        @click="$emit('close')"
      >
        <svg class="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      <div
        class="panel-color-difference flex h-full flex-col overflow-hidden rounded-2xl shadow-2xl lg:h-[80vh] lg:flex-row"
      >
        <!-- Photo Container -->
        <div class="bg-black relative flex flex-1 items-center justify-center overflow-hidden">
          <div
            v-if="isFullImageLoading"
            class="absolute inset-0 z-10 flex items-center justify-center"
          >
            <div
              class="h-12 w-12 animate-spin rounded-full border-4 border-gray-600 border-t-white"
            />
          </div>

          <img
            :src="editedPhoto.imageUrl"
            class="max-h-full max-w-full object-contain"
            @load="isFullImageLoading = false"
          />
        </div>

        <!-- Edit/Details Panel -->
        <div
          class="panel-color-difference flex w-full flex-col border-l border-transparent p-8 lg:w-96"
        >
          <div class="mb-8">
            <div class="mb-4 flex items-center gap-2">
              <span
                v-if="editedPhoto.isEvidence"
                class="bg-brand-primary/10 rounded-full px-3 py-1 text-xs font-bold uppercase text-brand-primary"
              >
                {{ t('dialog.photo_preview_modal.evidence_badge') }}
              </span>
              <span
                v-else
                class="bg-brand-primary/10 rounded-full px-3 py-1 text-xs font-bold uppercase text-brand-primary"
              >
                {{ t('dialog.photo_preview_modal.thumbnail_badge') }}
              </span>
            </div>
            <h3 class="text-base text-gray-600">
              {{ formatDateTimeToMinutes(editedPhoto.takenAt) }}
            </h3>
          </div>

          <div
            v-if="hasRelationPhotos"
            class="mb-6 rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div class="space-y-3 text-xs text-secondary-green">
              <div v-if="parentPhoto" class="space-y-2">
                <div class="flex items-center gap-2">
                  <span>{{ t('photo.relation.source_photo') }}</span>
                </div>
                <PhotoRelationThumbnails
                  :photos="[parentPhoto]"
                  :interactive="true"
                  :show-count="false"
                  size="md"
                  :label="t('photo.comparison.original')"
                  @select="handleOpenParentComparison"
                />
              </div>

              <div v-if="relatedPhotos.length > 0" class="space-y-2">
                <div class="flex items-center gap-2">
                  <span>
                    {{ t('photo.evidence_chain.after_photos', { count: relatedPhotos.length }) }}
                  </span>
                </div>
                <PhotoRelationThumbnails
                  :photos="relatedPhotos"
                  :interactive="true"
                  :show-count="true"
                  size="md"
                  :label="t('photo.comparison.follow_up')"
                  @select="handleOpenFollowUpComparison"
                />
              </div>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto">
            <PhotoEditFields
              v-if="editedPhoto"
              :show-space-selection="true"
              :initial-status="editedPhoto.status"
              :initial-pending-type="editedPhoto.pendingType"
              :initial-constructions="editedPhoto.constructions"
              :initial-space="editedPhoto.space"
              :initial-note="editedPhoto.note"
              @update:status="handleStatusUpdate"
              @update:pending-type="handlePendingTypeUpdate"
              @update:constructions="handleConstructionsUpdate"
              @update:space="handleSpaceUpdate"
              @update:note="handleNoteUpdate"
            />
          </div>

          <div class="flex gap-3 border-t border-gray-100 pt-6">
            <TextButton
              variant="primary"
              size="md"
              :loading="isSaving"
              :disabled="isSaving"
              class="flex-1"
              @click="handleSave"
            >
              {{
                isSaving
                  ? t('dialog.photo_preview_modal.saving')
                  : t('dialog.photo_preview_modal.save_changes')
              }}
            </TextButton>
            <a
              v-if="editedPhoto"
              :href="editedPhoto.imageUrl"
              download
              class="flex h-14 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-50"
            >
              <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </a>
          </div>
        </div>
      </div>

      <PhotoComparisonModal
        v-model="showComparisonModal"
        :original-photo="comparisonOriginalPhoto"
        :compare-photo="comparisonComparePhoto"
        :original-label="comparisonOriginalLabel"
        :compare-label="comparisonCompareLabel"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import PhotoComparisonModal from '@/components/photo/PhotoComparisonModal.vue';
import PhotoEditFields from '@/components/photo/PhotoEditFields.vue';
import PhotoRelationThumbnails from '@/components/photo/PhotoRelationThumbnails.vue';
import { type LocalPhoto, PendingType, type PhotoRecord, PhotoStatus } from '@/types/photo';
import { formatDateTimeToMinutes } from '@/utils/date';

type PhotoLike = LocalPhoto | PhotoRecord;

interface Props {
  selectedPhoto: PhotoRecord | null;
  availableSpaces: string[];
  isSaving: boolean;
  parentPhoto?: PhotoRecord | null;
  relatedPhotos?: PhotoRecord[];
}

interface Emits {
  (e: 'close'): void;
  (e: 'save', photo: PhotoRecord): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

const { t } = useI18n();

const isFullImageLoading = ref(false);
const editedPhoto = ref<PhotoRecord | null>(null);

const parentPhoto = computed(() => props.parentPhoto || null);
const relatedPhotos = computed(() => props.relatedPhotos || []);
const hasRelationPhotos = computed(
  () =>
    Boolean(editedPhoto.value?.parentPhotoId) ||
    parentPhoto.value !== null ||
    relatedPhotos.value.length > 0
);
const showComparisonModal = ref(false);
const comparisonOriginalPhoto = ref<PhotoRecord | null>(null);
const comparisonComparePhoto = ref<PhotoRecord | null>(null);
const comparisonOriginalLabel = ref('');
const comparisonCompareLabel = ref('');

const handleStatusUpdate = (status: PhotoStatus) => {
  if (editedPhoto.value) {
    editedPhoto.value.status = status;
  }
};

const handlePendingTypeUpdate = (pendingType: PendingType | null) => {
  if (editedPhoto.value) {
    editedPhoto.value.pendingType = pendingType;
  }
};

const handleConstructionsUpdate = (constructions: string[]) => {
  if (editedPhoto.value) {
    editedPhoto.value.constructions = constructions;
  }
};

const handleSpaceUpdate = (space: string | null) => {
  if (editedPhoto.value) {
    editedPhoto.value.space = space;
  }
};

const handleNoteUpdate = (note: string) => {
  if (editedPhoto.value) {
    editedPhoto.value.note = note;
  }
};

const openComparison = (
  originalPhoto: PhotoRecord | null,
  comparePhoto: PhotoRecord | null,
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
  openComparison(
    parentPhoto.value,
    editedPhoto.value,
    t('photo.comparison.original'),
    t('photo.comparison.follow_up')
  );
};

const handleOpenFollowUpComparison = (_photo: PhotoLike) => {
  if (!editedPhoto.value) return;
  openComparison(
    editedPhoto.value,
    _photo as PhotoRecord,
    t('photo.comparison.original'),
    t('photo.comparison.follow_up')
  );
};

watch(
  () => props.selectedPhoto,
  (newPhoto) => {
    if (newPhoto) {
      editedPhoto.value = { ...newPhoto };
      isFullImageLoading.value = true;
    } else {
      editedPhoto.value = null;
    }
  },
  { immediate: true }
);

watch(
  () => props.selectedPhoto,
  () => {
    showComparisonModal.value = false;
  }
);

const handleSave = () => {
  if (editedPhoto.value) {
    emit('save', editedPhoto.value);
  }
};
</script>
