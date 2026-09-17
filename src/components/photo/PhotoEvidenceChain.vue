<template>
  <div v-if="displayResolvedAt" class="relative rounded-lg border border-green-200 p-3">
    <div class="absolute right-3 top-3 flex flex-col gap-3">
      <TextButton
        v-if="props.onAddFollowUp"
        variant="primary"
        class="!border-green-500 !bg-green-50 !text-green-700 hover:!bg-green-100"
        size="sm"
        @click="handleAddFollowUpPhoto"
      >
        {{ t('camera.take_photo.follow_up_mode') }}
      </TextButton>
      <TextButton
        v-if="props.onGenerateFollowUpReport && isParentPhoto && relatedPhotos.length > 0"
        variant="primary"
        class="!border-green-500 !bg-green-50 !text-green-700 hover:!bg-green-100"
        size="sm"
        @click="handleGenerateFollowUpReport"
      >
        {{ t('report.followUp.generateReport') }}
      </TextButton>
    </div>
    <div class="space-y-2 text-sm text-secondary-green">
      <div class="flex items-center gap-2">
        <span
          >{{ t('photo.problem_discovered') }}:
          {{ photo?.takenAt ? formatDate(photo.takenAt) : '' }}</span
        >
      </div>
      <div class="flex items-center gap-2">
        <span>{{ t('photo.problem_resolved') }}: {{ formatDate(displayResolvedAt) }}</span>
      </div>
      <div v-if="photo?.parentPhotoId" class="flex items-center gap-2">
        <span>{{ t('photo.evidence_chain.follow_up_photo') }}</span>
      </div>
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
          :max-count="relatedPhotos.length"
          :interactive="true"
          :show-count="false"
          size="md"
          :label="t('photo.comparison.follow_up')"
          :deletable="Boolean(props.onRemoveRelatedPhoto)"
          :remove-label="t('button.delete')"
          @select="handleOpenFollowUpComparison"
          @remove="handleRemoveFollowUpPhoto"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import TextButton from '@/components/core/button/TextButton.vue';
import PhotoRelationThumbnails from '@/components/photo/PhotoRelationThumbnails.vue';
import { type LocalPhoto, type PhotoRecord, PhotoStatus } from '@/types/photo';
import { formatDate } from '@/utils/date';

type PhotoLike = LocalPhoto | PhotoRecord;

const props = defineProps<{
  photo: PhotoLike | null;
  parentPhoto?: PhotoLike | null;
  relatedPhotos?: PhotoLike[];
  currentResolvedAt?: Date;
  onAddFollowUp?: () => void;
  onRemoveRelatedPhoto?: (photo: PhotoLike) => void;
  onGenerateFollowUpReport?: () => void;
  onOpenParentComparison?: () => void;
  onOpenFollowUpComparison?: (photo: PhotoLike) => void;
}>();

const emit = defineEmits<{
  addFollowUp: [];
  removeRelatedPhoto: [photo: PhotoLike];
  generateFollowUpReport: [];
  openParentComparison: [];
  openFollowUpComparison: [photo: PhotoLike];
}>();

const { t } = useI18n();

const relatedPhotos = computed(() => props.relatedPhotos || []);

const displayResolvedAt = computed(() => {
  if (props.currentResolvedAt) {
    return props.currentResolvedAt;
  }

  if (props.photo?.resolvedAt) {
    return props.photo.resolvedAt;
  }

  if (props.photo?.status === PhotoStatus.RESOLVED || props.photo?.isEvidence) {
    return props.photo.updatedAt;
  }

  return undefined;
});

// Check if current photo is a parent photo (has follow-up photos)
const isParentPhoto = computed(() => {
  return relatedPhotos.value.length > 0;
});

const handleAddFollowUpPhoto = () => {
  emit('addFollowUp');
};

const handleRemoveFollowUpPhoto = (photo: PhotoLike) => {
  emit('removeRelatedPhoto', photo);
};

const handleGenerateFollowUpReport = () => {
  emit('generateFollowUpReport');
};

const handleOpenParentComparison = () => {
  emit('openParentComparison');
};

const handleOpenFollowUpComparison = (photo: PhotoLike) => {
  emit('openFollowUpComparison', photo);
};
</script>
