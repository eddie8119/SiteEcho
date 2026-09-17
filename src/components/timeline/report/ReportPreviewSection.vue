<template>
  <div class="mb-6">
    <H3Title :title="$t('report.generationSheet.preview')" class-name=" text-gray-500" />
    <div class="space-y-6 rounded-xl bg-gray-50 p-4">
      <div v-for="(group, space) in groupedPhotos" :key="space" class="space-y-4">
        <!-- Space Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-1 font-semibold text-gray-800">
            <img src="@/assets/icons/Location.png" alt="Location" class="h-4 w-4" />
            <span>{{ space || $t('report.generationSheet.uncategorized') }}</span>
            <span class="ml-2 text-xs font-normal text-gray-400">
              ({{
                getConstructionsForSpace(group).join('、') ||
                $t('report.generationSheet.uncategorized')
              }})
            </span>
          </div>
        </div>

        <!-- Group Note (Level 1) -->
        <ReportGroupNoteEditor
          :model-value="groupReportNotes[space] || ''"
          @update:model-value="emit('update:group-note', String(space), String($event))"
        />

        <!-- Photos Grid -->
        <div class="space-y-2">
          <div class="grid grid-cols-1 gap-3">
            <ReportPhotoGridItem
              v-for="item in group"
              :key="item.photo.id"
              :thumbnail-url="photoThumbnailUrls[item.photo.id]"
              :report-note="photoReportNotes[item.photo.id]"
              :note="item.photo.note"
              :is-editing="editingPhoto === item.photo.id"
              @click="emit('edit-photo', item.photo.id)"
            />
          </div>
        </div>

        <!-- Photo Note Editor (Level 2) -->
        <ReportPhotoNoteEditor
          v-if="editingPhoto && group[editingPhoto]"
          :model-value="photoReportNotes[editingPhoto] || ''"
          :original-note="group[editingPhoto].photo.note"
          @update:model-value="emit('update:photo-note', editingPhoto, $event)"
          @done="emit('done-editing')"
        />

        <!-- Billing (If applicable) -->
        <ReportBillingSection
          v-if="purpose === 'billing'"
          :model-value="billingAmounts"
          :space="space as string"
          :constructions="getConstructionsForSpace(group)"
          @update:model-value="emit('update:billing', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ReportBillingSection from './ReportBillingSection.vue';
import ReportGroupNoteEditor from './ReportGroupNoteEditor.vue';
import ReportPhotoGridItem from './ReportPhotoGridItem.vue';
import ReportPhotoNoteEditor from './ReportPhotoNoteEditor.vue';
import { getConstructionsForSpace } from './utils';

import type { GroupedPhotos } from '@/types/report';

import H3Title from '@/components/core/title/H3Title.vue';
import { Purpose } from '@/types/report';

defineProps<{
  groupedPhotos: GroupedPhotos;
  groupReportNotes: Record<string, string>;
  photoReportNotes: Record<string, string>;
  photoThumbnailUrls: Record<string, string>;
  billingAmounts: Record<string, number | undefined>;
  purpose: Purpose | null;
  editingPhoto: string | null;
}>();

const emit = defineEmits<{
  'update:group-note': [space: string, value: string];
  'edit-photo': [photoId: string];
  'update:photo-note': [photoId: string, value: string];
  'done-editing': [];
  'update:billing': [value: Record<string, number | undefined>];
}>();
</script>
