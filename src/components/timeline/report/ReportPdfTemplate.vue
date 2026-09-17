<template>
  <div
    class="relative box-border w-[794px] bg-gray-100 leading-normal text-gray-800"
    style="font-family: 'PingFang TC', 'Microsoft JhengHei', sans-serif"
  >
    <!-- Page 1: Cover / Overview -->
    <div class="pdf-page flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-12">
      <h1 class="mb-6 text-center text-2xl font-bold text-gray-900">
        {{
          purpose === 'billing'
            ? t('report.pdfTemplate.billingReport')
            : t('report.pdfTemplate.engineeringReport')
        }}
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
          {{ t('report.pdfTemplate.updateSummary') }}
        </h3>
        <div class="space-y-1 text-sm text-gray-600">
          <p>
            {{ t('report.pdfTemplate.photoCount') }}{{ totalPhotoCount }}
            {{ t('report.pdfTemplate.unit.photo') }}
          </p>
          <p>
            {{ t('report.pdfTemplate.spaceCount') }}{{ spaceCount }}
            {{ t('report.pdfTemplate.unit.space') }}
          </p>
        </div>
      </div>

      <div class="mb-6 border-t border-gray-200 pt-4">
        <h3 class="mb-2 text-base font-bold text-gray-800">{{ t('report.pdfTemplate.spaces') }}</h3>
        <ul class="space-y-1 text-sm text-gray-600">
          <li v-for="name in spaceNames" :key="name" class="flex items-center gap-2">
            <span class="h-1 w-1 rounded-full bg-gray-400" />
            {{ name }}
          </li>
        </ul>
      </div>

      <div v-if="completedItems.length > 0" class="mb-6 border-t border-gray-200 pt-4">
        <h3 class="mb-3 text-lg font-bold text-gray-800">
          {{ t('report.pdfTemplate.completedItems') }}
        </h3>
        <ul class="space-y-1 text-sm text-gray-600">
          <li v-for="item in completedItems" :key="`${item.space}-${item.construction}`">
            - {{ item.space }}{{ item.construction }}（{{
              item.status === CompletionStatus.COMPLETED ? '✅' : ''
            }}
            {{ t(`common.completionStatus.${item.status}`) }}）
          </li>
        </ul>
      </div>

      <div v-if="representativePhoto" class="mt-auto border-t border-gray-200 pt-4">
        <p class="mb-2 text-xs text-gray-400">{{ t('report.pdfTemplate.representativePhoto') }}</p>
        <img
          :src="photoUrls[representativePhoto.id]"
          class="h-[200px] w-full rounded-lg object-cover shadow-sm"
        />
      </div>

      <div class="mt-auto border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>{{ t('report.pdfTemplate.page', { current: 1, total: totalPages }) }}</p>
      </div>
    </div>

    <!-- Page 2+: Space Sections -->
    <div class="pdf-page flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-12">
      <div v-for="(group, space) in groups" :key="space" class="mb-8">
        <div class="mb-4 flex items-end justify-between border-b-2 border-orange-500 pb-2">
          <h2 class="text-lg font-bold text-gray-900">
            <img src="@/assets/icons/Location.png" alt="Location" class="inline-block h-5 w-5" />
            {{ space || t('report.pdfTemplate.uncategorized') }}
          </h2>
          <div class="text-right text-xs text-gray-600">
            <p>
              {{ t('report.pdfTemplate.constructionItems')
              }}{{
                getConstructionsForSpace(group).join('、') || t('report.pdfTemplate.uncategorized')
              }}
            </p>
            <p>
              {{ t('report.pdfTemplate.photoCountShort') }}{{ Object.keys(group).length }}
              {{ t('report.pdfTemplate.unit.photo') }}
            </p>
          </div>
        </div>

        <!-- Group Note -->
        <div
          v-if="groupNotes && groupNotes[space]"
          class="mb-2 rounded-lg bg-gray-50 p-4 text-sm italic text-gray-700 shadow-sm"
        >
          <div class="mb-1 flex items-center gap-2 font-bold not-italic text-gray-900">
            <span>{{ t('report.pdfTemplate.overallDescription') }}</span>
          </div>
          {{ groupNotes[space] }}
        </div>

        <div class="mb-6 grid grid-cols-2 gap-4">
          <div v-for="item in group" :key="item.photo.id" class="photo-item">
            <img
              :src="photoUrls[item.photo.id]"
              class="mb-2 h-[180px] w-full rounded-lg object-cover shadow-sm"
            />
            <div class="flex items-center justify-between text-[12px] text-gray-400">
              <div>
                <span>{{ formatDateTimeToMinutes(item.photo.takenAt) }}</span>
                <span
                  v-if="item.photo.status === 'resolved' && item.photo.resolvedAt"
                  class="ml-2 text-green-600"
                  >✅ {{ formatDate(item.photo.resolvedAt) }}</span
                >
              </div>
              <span class="font-medium">{{
                item.constructions.join(' / ') || t('report.pdfTemplate.uncategorized')
              }}</span>
            </div>
            <p
              v-if="photoNotes?.[item.photo.id] || (item.photo.reportNote && purpose !== 'billing')"
              class="mt-1 text-xs text-gray-700"
            >
              {{ photoNotes?.[item.photo.id] || item.photo.reportNote }}
            </p>
          </div>
        </div>

        <div class="space-y-3 border-t border-gray-200 pt-4">
          <div v-if="getPendingItems(group).length > 0">
            <h3 class="mb-1 text-sm font-bold text-amber-600">
              {{ t('report.pdfTemplate.pendingItems') }}
            </h3>
            <ul class="space-y-1 text-xs text-gray-600">
              <li v-for="(note, idx) in getPendingItems(group)" :key="idx" class="flex gap-2">
                <span>-</span>
                <span>{{ note }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="mt-auto border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>{{ t('report.pdfTemplate.page', { current: 2, total: totalPages }) }}</p>
      </div>
    </div>

    <!-- Page N: Billing Detail Page -->
    <div
      v-if="purpose === 'billing' && billing"
      class="pdf-page flex min-h-[1123px] w-[794px] flex-col bg-white px-10 py-12"
    >
      <div class="mb-6 border-b-2 border-orange-600 pb-3">
        <h1 class="mb-2 text-xl font-bold text-gray-900">
          {{ t('report.pdfTemplate.billingDetails') }}
        </h1>
        <div class="flex items-center justify-between text-sm text-gray-700">
          <p>{{ t('report.pdfTemplate.project') }}{{ projectTitle }}</p>
          <p>{{ t('report.pdfTemplate.date') }}{{ reportDateRange }}</p>
        </div>
      </div>

      <div class="mb-6 flex-1 space-y-2">
        <div
          v-for="(amount, key) in billingItems"
          :key="key"
          class="flex items-center justify-between border-b border-gray-100 py-2"
        >
          <span class="text-sm font-medium text-gray-800">{{ key }}</span>
          <span class="text-sm font-semibold">${{ amount.toLocaleString() }}</span>
        </div>
      </div>

      <div class="mb-8 border-t-4 border-double border-gray-300 pt-3">
        <div class="flex items-center justify-between">
          <span class="text-xl font-bold text-gray-900">{{ t('report.pdfTemplate.total') }}</span>
          <span class="text-2xl font-bold">${{ totalBillingAmount.toLocaleString() }}</span>
        </div>
      </div>

      <div class="mt-auto grid grid-cols-2 gap-4 border-t border-gray-200 pt-6">
        <div class="h-24 rounded-lg border border-dashed border-gray-300 p-3">
          <p class="text-xs text-gray-400">{{ t('report.pdfTemplate.signatureArea') }}</p>
        </div>
        <div class="h-24 rounded-lg border border-dashed border-gray-300 p-3">
          <p class="text-xs text-gray-400">{{ t('report.pdfTemplate.notes') }}</p>
        </div>
      </div>

      <div class="mt-auto border-t border-gray-200 pt-4 text-center text-xs text-gray-400">
        <p>{{ t('report.pdfTemplate.page', { current: totalPages, total: totalPages }) }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import { getConstructionsForSpace } from './utils';

import type { GroupedPhotos, PhotoWithConstructions } from '@/types/report';

import { CompletionStatus } from '@/types/photo';
import { formatDateTimeToMinutes } from '@/utils/date.ts';
import { getCompletedItems } from '@/utils/photoUtils';

const props = defineProps<{
  projectTitle: string;
  purpose: string | null;
  groups: GroupedPhotos;
  groupNotes?: Record<string, string>;
  photoNotes?: Record<string, string>;
  billing: Record<string, number> | null;
  photoUrls: Record<string, string>;
}>();

const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

const { t } = useI18n();

// 代表照片：取第一個空間的第一張照片
const representativePhoto = computed(() => {
  const firstSpace = Object.keys(props.groups)[0];
  if (!firstSpace) return null;
  const firstPhotoId = Object.keys(props.groups[firstSpace])[0];
  if (!firstPhotoId) return null;
  return props.groups[firstSpace][firstPhotoId].photo;
});

// 計算照片總數
const totalPhotoCount = computed(() => {
  let count = 0;
  for (const space in props.groups) {
    count += Object.keys(props.groups[space]).length;
  }
  return count;
});

// 計算施工區域數量
const spaceCount = computed(() => {
  return Object.keys(props.groups).length;
});

// 取得施工區域名稱列表
const spaceNames = computed(() => {
  return Object.keys(props.groups).map((space) => space || t('report.pdfTemplate.uncategorized'));
});

// 取得本次完成項目列表
const completedItems = computed(() => {
  // Flatten all photos from groups
  const allPhotos: PhotoWithConstructions[] = [];
  for (const space in props.groups) {
    for (const photoId in props.groups[space]) {
      allPhotos.push(props.groups[space][photoId]);
    }
  }
  return getCompletedItems(allPhotos.map((item) => item.photo));
});

// Helper: 取得待處理項目 (從備註中尋找帶有 ⚠ 字樣，或以 - 開頭的行，或 photo.status 為 pending)
const getPendingItems = (group: { [photoId: string]: PhotoWithConstructions }): string[] => {
  const pendingItems: string[] = [];
  Object.values(group).forEach((item) => {
    // 如果 photo.status 為 pending，加入備註內容
    if (item.photo.status === 'pending' && item.photo.note) {
      pendingItems.push(item.photo.note);
    }
    // 從備註中尋找帶有 ⚠ 或以 - 開頭的行
    if (item.photo.note) {
      const lines = item.photo.note.split('\n');
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('-') || trimmed.startsWith('•') || trimmed.includes('⚠')) {
          pendingItems.push(trimmed.replace(/^[-•]\s*/, ''));
        }
      });
    }
  });
  return [...new Set(pendingItems)]; // 去重
};

// 計算報告日期範圍：根據所有照片的 takenAt 決定
const reportDateRange = computed(() => {
  const dates: Date[] = [];

  // 收集所有照片的日期
  for (const space in props.groups) {
    for (const photoId in props.groups[space]) {
      const item = props.groups[space][photoId];
      if (item.photo.takenAt) {
        dates.push(item.photo.takenAt);
      }
    }
  }

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

// 計算請款總金額
const totalBillingAmount = computed(() => {
  if (!props.billing) return 0;

  return Object.values(props.billing).reduce((sum, amount) => sum + (amount || 0), 0);
});

// 請款明細項目列表（格式："空間 工種" -> 金額）
const billingItems = computed(() => {
  const billing = props.billing;
  if (!billing) return {};

  const result: Record<string, number> = {};
  Object.keys(billing).forEach((key) => {
    const amount = billing[key];
    if (amount !== undefined && amount !== null) {
      // 將 "空間-工種" 轉換為 "空間 工種"
      let displayKey = key.replace(/-/, ' ');
      // 如果 key 為空，顯示 "未分類"
      if (displayKey === '') {
        displayKey = t('report.pdfTemplate.uncategorized');
      }
      result[displayKey] = amount;
    }
  });
  return result;
});

// 計算總頁數
const totalPages = computed(() => {
  // 基礎頁數：封面 + 空間照片頁 = 2頁
  let count = 2;
  // 如果有請款明細，加1頁
  if (props.purpose === 'billing' && props.billing) {
    count += 1;
  }
  return count;
});
</script>

<style scoped>
.photo-item {
  break-inside: avoid;
}
</style>
