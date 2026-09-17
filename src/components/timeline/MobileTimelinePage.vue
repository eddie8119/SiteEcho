<template>
  <Header />

  <TimelineSearchHeader
    :search-text="filters.searchText"
    :status-filter="statusFilter"
    :pending-count="pendingCount"
    :resolved-count="resolvedCount"
    @update-search-text="emit('update-search-text', $event)"
    @toggle-status-filter="emit('toggle-status-filter', $event)"
  />

  <TimelineActiveFilters
    :active-filters="activeFilters"
    :has-active-filters="hasActiveFilters"
    @remove-filter="emit('remove-filter', $event)"
    @clear-all="emit('clear-all-filters')"
  />

  <BatchActionBar
    :is-visible="isMultiSelectMode"
    :count="selectedPhotos.size"
    :summary="selectionSummary"
    @cancel="emit('clear-selection')"
    @set-space="emit('update-show-space-picker', true)"
    @set-construction="emit('update-show-construction-picker', true)"
    @generate-report="emit('update-show-report-sheet', true)"
    @share="emit('share')"
    @download="handleDownload"
    @delete="emit('request-delete')"
  />

  <ReportGenerationSheet
    :model-value="showReportSheet"
    :selected-photos="selectedPhotosList"
    :all-photos="props.localPhotos"
    :initial-purpose="restoredReportData?.purpose || null"
    :initial-billing="restoredReportData?.billing || null"
    :initial-group-notes="initialGroupNotes"
    :class="{ 'blur-sm': showRegisterPrompt }"
    @update:model-value="emit('update-show-report-sheet', $event)"
    @download-pdf="emit('download-pdf', $event)"
    @download-word="emit('download-word', $event)"
  />

  <BatchDeleteConfirmDialog
    :model-value="showDeleteConfirm"
    :photos="selectedPhotosList"
    @update:model-value="emit('update-show-delete-confirm', $event)"
    @confirm="emit('execute-delete', $event.evidenceAction)"
  />

  <BatchAttributePickerSheet
    :model-value="showSpacePicker"
    type="space"
    :options="spaceOptions"
    :count="selectedPhotos.size"
    @update:model-value="emit('update-show-space-picker', $event)"
    @confirm="handleBatchSetSpace"
    @add-option="emit('add-space-option', $event)"
    @edit-item="(id, name) => emit('edit-space-option', id, name)"
    @delete-item="(id) => emit('delete-space-option', id)"
  />

  <BatchAttributePickerSheet
    :model-value="showConstructionPicker"
    type="construction"
    :options="constructionOptions"
    :count="selectedPhotos.size"
    @update:model-value="emit('update-show-construction-picker', $event)"
    @confirm="handleBatchSetConstruction"
    @add-option="emit('add-construction-option', $event)"
    @edit-item="(id, name) => emit('edit-construction-option', id, name)"
    @delete-item="(id) => emit('delete-construction-option', id)"
  />

  <MobileToast
    v-if="toastMessage"
    variant="success"
    :title="toastMessage"
    subtitle=""
    @close="emit('close-toast')"
  />

  <div
    class="mx-auto max-w-4xl overflow-hidden pb-24"
    :class="{
      'flex min-h-[calc(100dvh-200px)] flex-col justify-center': filteredPhotos.length === 0,
    }"
  >
    <div
      v-if="!hasActiveFilters && statusFilter === 'all' && filteredPhotos.length === 0"
      class="flex flex-col items-center gap-2"
    >
      <ContentEmptyState
        :title="t('timeline.empty_state.no_photos_title')"
        :description="t('timeline.empty_state.no_photos_description')"
        :button-label="t('timeline.empty_state.take_photo_button')"
        button-to="/mobile/take-photo"
      />
      <p>{{ t('timeline.or') }}</p>
      <div class="flex justify-center">
        <TextButton
          variant="primary"
          size="md"
          class="h-[30px] md:w-auto"
          @click="emit('import-click')"
        >
          {{ t('timeline.import_from_gallery') }}
        </TextButton>
      </div>
    </div>
    <div
      v-else-if="(hasActiveFilters || statusFilter !== 'all') && filteredPhotos.length === 0"
      class="flex flex-col items-center gap-2 py-12"
    >
      <p v-if="statusFilter === 'pending'">
        {{ t('timeline.empty_state.no_pending_photos') }}
      </p>
      <p v-else-if="statusFilter === 'resolved'">
        {{ t('timeline.empty_state.no_resolved_photos') }}
      </p>
      <TimelineEmptyState
        v-else
        :show-clear-button="hasActiveFilters"
        @clear-filters="emit('clear-all-filters')"
      />
    </div>

    <PhotoGroup
      v-for="group in groupedLocalPhotos"
      :key="group.date"
      :date-label="group.dateLabel"
      :photos="group.photos"
      :selected-photos="selectedPhotos"
      :is-multi-select-mode="isMultiSelectMode"
      :show-sync-status="true"
      :follow-up-photos-by-parent-id="followUpPhotosByParentId"
      @photo-click="handlePhotoClick"
      @photo-touchstart="handlePhotoTouchStart"
      @photo-touchend="handlePhotoTouchEnd"
      @photo-mousedown="handlePhotoMouseDown"
      @photo-mouseup="handlePhotoMouseUp"
      @space-click="handleSpaceClick"
      @construction-click="handleConstructionClick"
      @toggle-evidence="handleToggleEvidence"
      @show-all-constructions="showConstructionsDialog"
    />
  </div>

  <ShareRecordSheet
    :model-value="showShareRecordSheet"
    :photo-ids="sharePhotoIds"
    @update:model-value="emit('update-show-share-record-sheet', $event)"
    @record-complete="handleShareRecordComplete"
  />

  <ConstructionsDialog
    v-model="showAllConstructionsDialog"
    :constructions="currentConstructions"
    @close="showAllConstructionsDialog = false"
  />

  <TimelineFab v-if="filteredPhotos.length > 0" :on-import-click="() => emit('import-click')" />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { PhotoFilterType } from '@/types/filter';
import type { ConstructionOption, LocalPhoto, PhotoRecord, SpaceOption } from '@/types/photo';
import type { GroupedPhotos, Purpose } from '@/types/report';

import TextButton from '@/components/core/button/TextButton.vue';
import ContentEmptyState from '@/components/core/ContentEmptyState.vue';
import BatchDeleteConfirmDialog from '@/components/core/dialog/BatchDeleteConfirmDialog.vue';
import ConstructionsDialog from '@/components/core/dialog/ConstructionsDialog.vue';
import MobileToast from '@/components/core/toast/MobileToast.vue';
import BatchActionBar from '@/components/timeline/BatchActionBar.vue';
import BatchAttributePickerSheet from '@/components/timeline/BatchAttributePickerSheet.vue';
import Header from '@/components/timeline/Header.vue';
import PhotoGroup from '@/components/timeline/PhotoGroup.vue';
import ReportGenerationSheet from '@/components/timeline/report/ReportGenerationSheet.vue';
import ShareRecordSheet from '@/components/timeline/ShareRecordSheet.vue';
import TimelineActiveFilters from '@/components/timeline/TimelineActiveFilters.vue';
import TimelineEmptyState from '@/components/timeline/TimelineEmptyState.vue';
import TimelineFab from '@/components/timeline/TimelineFab.vue';
import TimelineSearchHeader from '@/components/timeline/TimelineSearchHeader.vue';
import { addMetadataToImage } from '@/composables/timeline/useTimelineShare';
import { useCurrentProjectStore } from '@/composables/useCurrentProject';
import { EvidenceAction } from '@/composables/useTimelineMultiSelect';
import { type ShareTarget } from '@/types/photo';

interface GroupedPhoto {
  date: string;
  dateLabel: string;
  photos: LocalPhoto[];
}

interface FilterStateView {
  searchText: string;
}

interface ReportData {
  purpose: string | null;
  groups: GroupedPhotos;
  billing: Record<string, number> | null;
}

const props = defineProps<{
  filters: FilterStateView;
  activeFilters: Array<{ type: PhotoFilterType; value: string }>;
  hasActiveFilters: boolean;
  isMultiSelectMode: boolean;
  selectedPhotos: Set<string>;
  selectionSummary: string;
  showDeleteConfirm: boolean;
  showSpacePicker: boolean;
  showConstructionPicker: boolean;
  showReportSheet: boolean;
  showShareRecordSheet: boolean;
  sharePhotoIds: string[];
  toastMessage: string;
  spaceOptions: SpaceOption[];
  constructionOptions: ConstructionOption[];
  localPhotos: LocalPhoto[];
  filteredPhotos: LocalPhoto[];
  groupedLocalPhotos: GroupedPhoto[];
  followUpPhotosByParentId?: Record<string, Array<LocalPhoto | PhotoRecord>>;
  statusFilter: 'all' | 'pending' | 'resolved';
  pendingCount: number;
  resolvedCount: number;
  showRegisterPrompt: boolean;
  restoredReportData: {
    purpose: Purpose | null;
    billing: Record<string, number> | null;
  } | null;
  initialGroupNotes?: Record<string, string>;
}>();

const emit = defineEmits<{
  'update-search-text': [value: string];
  'toggle-status-filter': [value: 'pending' | 'resolved'];
  'remove-filter': [filterType: PhotoFilterType];
  'clear-all-filters': [];
  'clear-selection': [];
  'request-delete': [];
  'execute-delete': [evidenceAction: EvidenceAction];
  'update-show-delete-confirm': [value: boolean];
  'update-show-space-picker': [value: boolean];
  'update-show-construction-picker': [value: boolean];
  'update-show-report-sheet': [value: boolean];
  'update-show-share-record-sheet': [value: boolean];
  'batch-set-space': [name: string];
  'batch-set-construction': [name: string | string[]];
  'add-space-option': [name: string];
  'add-construction-option': [name: string];
  'edit-space-option': [id: string, name: string];
  'edit-construction-option': [id: string, name: string];
  'delete-space-option': [id: string];
  'delete-construction-option': [id: string];
  'close-toast': [];
  'show-toast': [message: string];
  'photo-click': [photo: LocalPhoto | PhotoRecord];
  'photo-touchstart': [photo: LocalPhoto | PhotoRecord];
  'photo-touchend': [];
  'photo-mousedown': [photo: LocalPhoto | PhotoRecord];
  'photo-mouseup': [];
  'space-click': [space: string];
  'construction-click': [construction: string];
  'toggle-evidence': [photo: LocalPhoto | PhotoRecord];
  'download-word': [data: ReportData];
  'download-pdf': [data: ReportData];
  'import-click': [];
  share: [];
}>();

const handlePhotoClick = (photo: LocalPhoto | PhotoRecord) => {
  emit('photo-click', photo);
};

const handlePhotoTouchStart = (photo: LocalPhoto | PhotoRecord) => {
  emit('photo-touchstart', photo);
};

const handlePhotoTouchEnd = () => {
  emit('photo-touchend');
};

const handlePhotoMouseDown = (photo: LocalPhoto | PhotoRecord) => {
  emit('photo-mousedown', photo);
};

const handlePhotoMouseUp = () => {
  emit('photo-mouseup');
};

const handleSpaceClick = (space: string) => {
  emit('space-click', space);
};

const handleConstructionClick = (construction: string) => {
  emit('construction-click', construction);
};

const handleToggleEvidence = (photo: LocalPhoto | PhotoRecord) => {
  emit('toggle-evidence', photo);
};

const selectedPhotosList = computed(() => {
  return props.localPhotos.filter((p) => props.selectedPhotos.has(p.id));
});

const handleBatchSetSpace = (name: string | string[]) => {
  if (typeof name === 'string') {
    emit('batch-set-space', name);
  }
};

const handleBatchSetConstruction = (name: string | string[]) => {
  emit('batch-set-construction', name);
};

const handleShareRecordComplete = (target: ShareTarget) => {
  const targetStr = target.trade ? `${target.trade}｜${target.displayName}` : target.displayName;
  emit('show-toast', t('timeline.toast.shared_success', { target: targetStr }));
};

const handleDownload = async () => {
  const photos = selectedPhotosList.value;
  if (photos.length === 0) return;

  try {
    // Add metadata to images using canvas
    const filesWithMetadata = await Promise.all(
      photos.map((photo, index) =>
        addMetadataToImage(
          photo,
          index,
          currentProjectName.value || t('project.selector.no_projects')
        )
      )
    );

    // Download enhanced images
    for (const file of filesWithMetadata) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    emit('show-toast', t('timeline.toast.download_success'));
  } catch (error) {
    console.error('Download failed:', error);
    emit('show-toast', t('timeline.toast.download_failed'));
  }
};

// Show All Constructions Dialog State
const showAllConstructionsDialog = ref(false);
const currentConstructions = ref<string[]>([]);

const { t } = useI18n();
const currentProjectStore = useCurrentProjectStore();
const { currentProjectName } = storeToRefs(currentProjectStore);

const showConstructionsDialog = (constructions: string[]) => {
  currentConstructions.value = constructions;
  showAllConstructionsDialog.value = true;
};
</script>

<style scoped lang="scss"></style>
