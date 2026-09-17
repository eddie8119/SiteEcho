<template>
  <div class="mb-6">
    <H3Title :title="$t('report.followUp.title')" class-name=" text-gray-500" />
    <div class="space-y-6 rounded-xl bg-gray-50 p-4">
      <div v-for="group in followUpGroups" :key="group.parentId" class="space-y-4">
        <!-- Problem Header -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-semibold text-gray-800">
            <img :src="LocationIcon" class="h-5 w-5" />
            <span>{{ group.space }}</span>
          </div>
          <div v-if="group.constructions.length > 0" class="text-xs font-normal text-gray-400">
            {{ group.constructions.join('、') }}
          </div>
        </div>
        <div class="text-sm text-gray-600">
          {{ group.note || $t('report.followUp.noDescription') }}
        </div>

        <!-- Before/After Grid -->
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <!-- Before -->
          <div class="rounded-lg border-2 border-amber-200 p-3">
            <div class="mb-2 flex items-center justify-between text-sm font-bold text-amber-700">
              <div class="flex items-center gap-2">
                <span>⚠️</span>
                <span>{{ $t('report.followUp.before') }}</span>
              </div>
              <div
                v-if="group.pendingType"
                class="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
              >
                {{ $t(`tab.pendingPhotos.${group.pendingType}`) }}
              </div>
            </div>
            <img
              :src="photoThumbnailUrls[group.parentPhoto.id]"
              class="mb-2 h-[180px] w-full rounded-lg object-cover"
            />
            <div class="flex items-center justify-between text-xs text-gray-600">
              <span>{{ formatDateTimeToMinutes(group.parentPhoto.takenAt) }}</span>
            </div>
          </div>

          <!-- After -->
          <div class="rounded-lg border-2 border-green-200 p-3">
            <div class="mb-2 flex items-center gap-2 text-sm font-bold text-green-700">
              <CheckmarkIcon />
              <span>{{ $t('report.followUp.after') }}</span>
            </div>
            <div class="mb-2 grid grid-cols-2 gap-2">
              <img
                v-for="photo in group.followUpPhotos"
                :key="photo.id"
                :src="photoThumbnailUrls[photo.id]"
                class="h-[85px] w-full rounded-lg object-cover"
              />
            </div>
            <div class="flex items-center justify-between text-xs text-gray-600">
              <span>{{ formatDate(group.resolvedAt) }}</span>
            </div>
          </div>
        </div>

        <!-- Note Editor -->
        <div v-if="editingGroup === group.parentId" class="rounded-lg bg-white p-4 shadow-sm">
          <textarea
            :value="groupNotes[group.parentId] || ''"
            class="w-full rounded-lg border border-gray-200 p-3 text-base focus:border-brand-primary focus:outline-none"
            rows="3"
            :placeholder="$t('report.followUp.notePlaceholder')"
            inputmode="text"
            autocorrect="off"
            autocomplete="off"
            spellcheck="false"
            @input="
              emit(
                'update:group-note',
                group.parentId,
                ($event.target as HTMLTextAreaElement).value
              )
            "
          />
          <div class="mt-2 flex justify-end gap-2">
            <TextButton variant="ghost" size="sm" @click="emit('done-editing')">
              {{ $t('common.cancel') }}
            </TextButton>
            <TextButton variant="primary" size="sm" @click="emit('done-editing')">
              {{ $t('common.save') }}
            </TextButton>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="followUpGroups.length === 0" class="rounded-lg bg-white p-8 text-center">
        <p class="text-sm text-gray-500">{{ $t('report.followUp.noFollowUpRecords') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LocalPhoto } from '@/types/photo';

import LocationIcon from '@/assets/icons/Location.png';
import TextButton from '@/components/core/button/TextButton.vue';
import H3Title from '@/components/core/title/H3Title.vue';
import CheckmarkIcon from '@/components/ui/CheckmarkIcon.vue';
import { PendingType } from '@/types/photo';
import { formatDateTimeToMinutes } from '@/utils/date.ts';

interface FollowUpGroup {
  parentId: string;
  parentPhoto: LocalPhoto;
  followUpPhotos: LocalPhoto[];
  space: string;
  note: string;
  constructions: string[];
  pendingType?: PendingType;
  resolvedAt: Date;
}

defineProps<{
  followUpGroups: FollowUpGroup[];
  groupNotes: Record<string, string>;
  photoThumbnailUrls: Record<string, string>;
  editingGroup: string | null;
}>();

const emit = defineEmits<{
  'update:group-note': [parentId: string, value: string];
  'done-editing': [];
}>();

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};
</script>
