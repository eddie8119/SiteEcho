<template>
  <div class="reports-page h-full overflow-y-auto bg-gray-50 p-8">
    <div class="mx-auto max-w-4xl">
      <div class="mb-4">
        <H1Title title="產生報告" />
        <p class="text-gray-500">選擇施工空間與時間範圍，一鍵生成專業報告。</p>
      </div>

      <div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <!-- Selection Filters -->
        <div class="space-y-6 lg:col-span-2">
          <!-- 1. Space Selection -->
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div class="flex items-center">
              <span
                class="bg-brand-primary/10 mb-2 mr-3 flex h-8 w-8 items-center justify-center rounded-full text-sm text-brand-primary"
              >
                1
              </span>
              <H2Title title="選擇輸出空間" />
            </div>

            <div v-if="isLoadingPhotos" class="py-4 text-center text-gray-500">
              載入空間資料中...
            </div>
            <div
              v-else-if="availableSpaces.length === 0"
              class="py-4 text-center italic text-gray-400"
            >
              目前暫無空間資料
            </div>
            <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <label
                v-for="space in availableSpaces"
                :key="space"
                class="relative flex cursor-pointer items-center rounded-xl border p-4 transition-all hover:bg-gray-50"
                :class="
                  selectedSpaces.includes(space)
                    ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary'
                    : 'border-gray-200 bg-white'
                "
              >
                <input
                  v-model="selectedSpaces"
                  type="checkbox"
                  :value="space"
                  class="h-4 w-4 rounded border-gray-300 text-brand-primary focus:ring-brand-primary"
                />
                <span
                  class="ml-3 text-sm font-medium"
                  :class="selectedSpaces.includes(space) ? 'text-brand-primary' : 'text-gray-700'"
                >
                  {{ space }}
                </span>
              </label>
            </div>

            <div class="mt-6 flex gap-4 border-t border-gray-100 pt-6">
              <button
                class="hover:text-brand-primary/90 text-sm font-medium text-brand-primary"
                @click="selectedSpaces = [...availableSpaces]"
              >
                全選空間
              </button>
              <button
                class="text-sm font-medium text-gray-500 hover:text-gray-600"
                @click="selectedSpaces = []"
              >
                取消全選
              </button>
            </div>
          </div>

          <!-- 2. Date Range -->
          <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div class="flex items-center">
              <span
                class="bg-brand-primary/10 mb-2 mr-3 flex h-8 w-8 items-center justify-center rounded-full text-sm text-brand-primary"
              >
                2
              </span>
              <H2Title title="選擇時間範圍" />
            </div>

            <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label class="mb-2 block text-sm font-bold text-gray-700">開始日期</label>
                <input
                  v-model="dateRange.start"
                  type="date"
                  class="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-primary focus:ring-brand-primary"
                />
              </div>
              <div>
                <label class="mb-2 block text-sm font-bold text-gray-700">結束日期</label>
                <input
                  v-model="dateRange.end"
                  type="date"
                  class="block w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-3 text-base focus:border-brand-primary focus:ring-brand-primary"
                />
              </div>
            </div>
          </div>

          <!-- 3. Report Preview / Info -->
          <div class="bg-brand-primary/10 rounded-xl p-2 text-brand-primary">
            <div class="flex">
              <div class="flex-shrink-0">
                <svg class="text-brand-primary/60 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fill-rule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clip-rule="evenodd"
                  />
                </svg>
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-bold">報告生成資訊</h3>
                <div class="mt-2 text-sm">
                  <p>
                    根據您的篩選條件，預計將包含
                    <strong>{{ filteredPhotosCount }}</strong>
                    張照片。 生成的報告將包含空間分類、施工紀錄備註與時間戳記。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions / Summary Side -->
        <div class="space-y-6">
          <div class="sticky top-8 space-y-6">
            <div class="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
              <H2Title title="輸出格式" class-name="mb-6" />

              <div class="space-y-3">
                <button
                  v-for="format in exportFormats"
                  :key="format.id"
                  class="group flex w-full items-center justify-between rounded-xl border p-4 transition-all hover:shadow-md"
                  :class="
                    activeFormat === format.id
                      ? 'bg-brand-primary/10 border-brand-primary ring-1 ring-brand-primary'
                      : 'border-gray-200 bg-white'
                  "
                  @click="activeFormat = format.id"
                >
                  <div class="flex items-center">
                    <img :src="format.icon" class="mr-3 h-6 w-6" alt="" />
                    <div class="text-left">
                      <p
                        class="text-sm font-bold"
                        :class="activeFormat === format.id ? 'text-brand-primary' : 'text-gray-900'"
                      >
                        {{ format.name }}
                      </p>
                      <p class="text-xs text-gray-500">{{ format.description }}</p>
                    </div>
                  </div>
                </button>
              </div>

              <TextButton
                variant="primary"
                size="lg"
                :loading="isGenerating"
                :disabled="filteredPhotosCount === 0"
                :full-width="true"
                class="mt-8"
                @click="generateReport"
              >
                產生報告
              </TextButton>

              <p
                v-if="filteredPhotosCount === 0"
                class="mt-4 text-center text-xs font-medium text-brand-primary"
              >
                ⚠️ 請先在左側選擇空間或調整日期
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onActivated, onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';

import docIcon from '@/assets/icons/Doc.png';
import pdfIcon from '@/assets/icons/Pdf.png';
import TextButton from '@/components/core/button/TextButton.vue';
import H1Title from '@/components/core/title/H1Title.vue';
import H2Title from '@/components/core/title/H2Title.vue';
import { useDesktopPhotos } from '@/composables/query/useDesktopPhotos';

const route = useRoute();
const projectId = computed(() => route.query.projectId as string | undefined);
const { photos, isLoadingPhotos, refetchPhotos } = useDesktopPhotos({ projectId });

const selectedSpaces = ref<string[]>([]);
const dateRange = ref({
  start: '',
  end: '',
});
const activeFormat = ref('pdf');
const isGenerating = ref(false);

const exportFormats = [
  { id: 'pdf', name: 'PDF 報告', icon: pdfIcon, description: '最適合分享給客戶與業主' },
  // { id: 'excel', name: 'Excel 表格', icon: xlsIcon, description: '用於成本計算與資料整理' },
  { id: 'word', name: 'Word 檔案', icon: docIcon, description: '可進一步編輯報告內容' },
];

// Initialize date range to current month
onMounted(() => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  dateRange.value.start = start.toISOString().split('T')[0];
  dateRange.value.end = now.toISOString().split('T')[0];
});

onActivated(() => {
  refetchPhotos();
});

// Available spaces derived from photos
const availableSpaces = computed(() => {
  if (!photos.value) return [];
  const spaces = new Set<string>();
  photos.value.forEach((p) => {
    if (p.space) spaces.add(p.space);
  });
  return Array.from(spaces).sort();
});

// Filter photos based on selection
const filteredPhotos = computed(() => {
  if (!photos.value) return [];

  return photos.value.filter((p) => {
    // Space filter
    const spaceMatch =
      selectedSpaces.value.length === 0 || (p.space && selectedSpaces.value.includes(p.space));
    if (!spaceMatch) return false;

    // Date range filter
    const photoDate = new Date(p.takenAt).toISOString().split('T')[0];
    const dateMatch =
      (!dateRange.value.start || photoDate >= dateRange.value.start) &&
      (!dateRange.value.end || photoDate <= dateRange.value.end);

    return dateMatch;
  });
});

const filteredPhotosCount = computed(() => filteredPhotos.value.length);

const generateReport = async () => {
  if (filteredPhotosCount.value === 0) return;

  isGenerating.value = true;

  // Mock generation delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  isGenerating.value = false;
  alert('報告已生成並開始下載！');
};
</script>

<style scoped lang="scss">
.reports-page {
  scrollbar-gutter: stable;
}

input[type='date']::-webkit-calendar-picker-indicator {
  cursor: pointer;
  filter: invert(0.5);
}
</style>
