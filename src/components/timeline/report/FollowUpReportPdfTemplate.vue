<template>
  <div
    class="relative box-border w-[794px] bg-gray-100 leading-normal text-gray-800"
    style="font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif"
  >
    <!-- Cover Page -->
    <div class="pdf-page flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-12">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
        {{ t('report.followUp.title') }}
      </h1>

      <div class="mb-8 space-y-2 text-sm text-gray-700">
        <p>
          <span class="inline-block w-16 font-medium">{{ t('report.pdfTemplate.project') }}</span
          >{{ projectTitle }}
        </p>
        <p>
          <span class="inline-block w-16 font-medium">{{ t('report.pdfTemplate.date') }}</span
          >{{ reportDateRange }}
        </p>
      </div>

      <div class="mb-6 border-t border-gray-200 pt-4">
        <h3 class="mb-3 text-lg font-bold text-gray-800">
          {{ t('report.followUp.summary') }}
        </h3>
        <div class="space-y-1 text-sm text-gray-600">
          <p>
            {{ t('report.followUp.totalProblems') }}{{ followUpGroups.length }}
            {{ t('report.pdfTemplate.unit.problem') }}
          </p>
          <p>
            {{ t('report.followUp.totalResolved') }}{{ followUpGroups.length }}
            {{ t('report.pdfTemplate.unit.problem') }}
          </p>
        </div>
      </div>

      <div v-if="followUpGroups.length > 0" class="mb-6 border-t border-gray-200 pt-4">
        <h3 class="mb-2 text-base font-bold text-gray-800">{{ t('report.followUp.locations') }}</h3>
        <ul class="space-y-1 text-sm text-gray-600">
          <li v-for="group in followUpGroups" :key="group.parentId" class="flex items-center gap-2">
            <span class="h-1 w-1 rounded-full bg-gray-400" />
            {{ group.space }} - {{ group.note || t('report.followUp.noDescription') }}
          </li>
        </ul>
      </div>

      <div v-if="firstGroup" class="mt-auto border-t border-gray-200 pt-4">
        <p class="mb-2 text-xs text-gray-400">{{ t('report.followUp.representativeProblem') }}</p>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="mb-1 text-xs text-gray-500">Before</p>
            <img
              :src="photoUrls[firstGroup.parentPhoto.id]"
              class="h-[200px] w-full rounded-lg object-cover shadow-sm"
            />
          </div>
          <div>
            <p class="mb-1 text-xs text-gray-500">After</p>
            <div class="grid grid-cols-2 gap-2">
              <img
                v-for="photo in firstGroup.followUpPhotos.slice(0, 2)"
                :key="photo.id"
                :src="photoUrls[photo.id]"
                class="h-[95px] w-full rounded-lg object-cover shadow-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <div class="mt-auto border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>{{ t('report.pdfTemplate.page', { current: 1, total: totalPages }) }}</p>
      </div>
    </div>

    <!-- Problem Detail Pages -->
    <div
      v-for="(group, index) in followUpGroups"
      :key="group.parentId"
      class="pdf-page flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-12"
    >
      <div class="mb-6 border-b-2 border-green-500 pb-3">
        <h2 class="text-xl font-bold text-gray-900">
          <span class="text-green-600">📍</span> {{ group.space }}｜{{
            group.note || t('report.followUp.noDescription')
          }}
        </h2>
        <div class="mt-2 flex gap-4 text-sm text-gray-600">
          <span v-if="group.constructions.length > 0">
            {{ t('report.pdfTemplate.constructionItems') }}{{ group.constructions.join('、') }}
          </span>
        </div>
      </div>

      <!-- Before Section -->
      <div class="mb-6">
        <h3 class="mb-3 flex items-center gap-2 text-lg font-bold text-amber-600">
          ⚠️ {{ t('report.followUp.before') }}
        </h3>
        <div class="rounded-lg bg-amber-50 p-4">
          <img
            :src="photoUrls[group.parentPhoto.id]"
            class="mb-2 h-[300px] w-full rounded-lg object-cover shadow-sm"
          />
          <div class="flex items-center justify-between text-sm text-gray-700">
            <div>
              <span>{{ formatDateTimeToMinutes(group.parentPhoto.takenAt) }}</span>
            </div>
            <div v-if="group.parentPhoto.note" class="ml-4 flex-1 italic text-gray-600">
              {{ group.parentPhoto.note }}
            </div>
          </div>
        </div>
      </div>

      <!-- After Section -->
      <div class="mb-6">
        <h3 class="mb-3 flex items-center gap-2 text-lg font-bold text-green-600">
          ✅ {{ t('report.followUp.after') }}
        </h3>
        <div class="rounded-lg bg-green-50 p-4">
          <div class="mb-2 grid grid-cols-2 gap-4">
            <div v-for="photo in group.followUpPhotos" :key="photo.id" class="photo-item">
              <img
                :src="photoUrls[photo.id]"
                class="mb-2 h-[180px] w-full rounded-lg object-cover shadow-sm"
              />
              <div class="text-sm text-gray-700">
                <span>{{ formatDateTimeToMinutes(photo.takenAt) }}</span>
              </div>
            </div>
          </div>
          <div
            class="mt-2 flex items-center justify-between border-t border-green-200 pt-3 text-sm"
          >
            <div class="flex items-center gap-2 text-green-700">
              <span>🕒</span>
              <span>{{ t('report.followUp.resolvedAt') }}{{ formatDate(group.resolvedAt) }}</span>
            </div>
            <div
              v-if="group.pendingType"
              class="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800"
            >
              {{ t(`tab.pendingPhotos.${group.pendingType}`) }}
            </div>
          </div>
        </div>
      </div>

      <div class="mt-auto border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>{{ t('report.pdfTemplate.page', { current: index + 2, total: totalPages }) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import type { LocalPhoto } from '@/types/photo';

import { PendingType } from '@/types/photo';
import { formatDateTimeToMinutes } from '@/utils/date.ts';

interface FollowUpGroup {
  parentId: string;
  parentPhoto: LocalPhoto;
  followUpPhotos: LocalPhoto[];
  space: string;
  note: string;
  constructions: string[];
  pendingType?: PendingType | string;
  resolvedAt: Date;
}

const props = defineProps<{
  projectTitle: string;
  followUpGroups: FollowUpGroup[];
  photoUrls: Record<string, string>;
}>();

const { t } = useI18n();

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

// 取第一組作為代表
const firstGroup = computed(() => {
  return props.followUpGroups[0] || null;
});

// 計算報告日期範圍
const reportDateRange = computed(() => {
  if (props.followUpGroups.length === 0) {
    return new Date().toLocaleDateString();
  }

  const dates: Date[] = [];

  // 收集所有照片的日期
  props.followUpGroups.forEach((group) => {
    dates.push(group.parentPhoto.takenAt);
    group.followUpPhotos.forEach((photo) => {
      dates.push(photo.takenAt);
    });
  });

  if (dates.length === 0) {
    return new Date().toLocaleDateString();
  }

  // 找出最早和最晚的日期
  const sortedDates = dates.sort((a, b) => a.getTime() - b.getTime());
  const earliestDate = sortedDates[0];
  const latestDate = sortedDates[sortedDates.length - 1];

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  };

  // 如果都是同一天，只顯示單一日期
  const earliestStr = formatDate(earliestDate);
  const latestStr = formatDate(latestDate);

  if (earliestStr === latestStr) {
    return earliestStr;
  }

  // 跨日期則顯示範圍
  return `${earliestStr} ~ ${latestStr}`;
});

// 計算總頁數：封面 + 每個問題一頁
const totalPages = computed(() => {
  return 1 + props.followUpGroups.length;
});
</script>

<style scoped>
.photo-item {
  break-inside: avoid;
}
</style>
