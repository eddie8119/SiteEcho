<template>
  <LandingLayout>
    <section class="tutorial-section py-20">
      <div class="container mx-auto px-4">
        <div class="mb-16 text-center">
          <h1 class="mb-4 text-4xl font-bold text-gray-900">操作教學</h1>
          <p class="mx-auto max-w-3xl text-xl text-gray-600">
            三步驟輕鬆上手，讓工地管理變得簡單高效
          </p>
        </div>

        <div class="mx-auto max-w-6xl">
          <!-- 步驟內容 -->
          <div class="grid items-center gap-12 lg:grid-cols-2">
            <!-- 左側：步驟說明 -->
            <div>
              <div class="space-y-8">
                <div
                  v-for="(step, index) in steps"
                  :key="step.id"
                  :class="[
                    'cursor-pointer rounded-xl p-6 transition-all',
                    currentStep === index
                      ? 'border-2 border-yellow-300 bg-yellow-50'
                      : 'border-2 border-gray-200 bg-white hover:border-gray-300',
                  ]"
                  @click="currentStep = index"
                >
                  <div class="flex items-start">
                    <div
                      :class="[
                        'mr-4 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full font-bold',
                        currentStep === index
                          ? 'bg-yellow-500 text-white'
                          : currentStep > index
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-600',
                      ]"
                    >
                      <span v-if="currentStep > index">✓</span>
                      <span v-else>{{ index + 1 }}</span>
                    </div>
                    <div class="flex-1">
                      <h3
                        :class="[
                          'mb-2 text-xl font-bold',
                          currentStep === index ? 'text-yellow-700' : 'text-gray-900',
                        ]"
                      >
                        {{ step.title }}
                      </h3>
                      <p class="mb-3 text-gray-600">{{ step.description }}</p>
                      <ul class="space-y-2">
                        <li
                          v-for="feature in step.features"
                          :key="feature"
                          class="flex items-center text-sm text-gray-600"
                        >
                          <span class="mr-2 text-green-500">✓</span>
                          {{ feature }}
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 右側：視覺展示 -->
            <div>
              <div class="rounded-xl bg-white p-8 shadow-lg">
                <div class="flex aspect-video items-center justify-center rounded-lg bg-gray-100">
                  <div class="text-center">
                    <h4 class="mb-2 text-xl font-bold text-gray-900">
                      {{ steps[currentStep].title }}
                    </h4>
                    <p class="text-gray-600">
                      {{ steps[currentStep].demoText }}
                    </p>

                    <!-- 模擬界面 -->
                    <div class="mt-6 rounded-lg border bg-white p-4 text-left">
                      <div class="space-y-3">
                        <div class="h-4 w-3/4 rounded bg-gray-200" />
                        <div class="h-4 w-1/2 rounded bg-gray-200" />
                        <div class="h-4 w-2/3 rounded bg-gray-200" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA 區域 -->
          <div class="mt-16 text-center">
            <div class="rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 p-8 text-white">
              <h3 class="mb-4 text-2xl font-bold">準備好開始了嗎？</h3>
              <p class="mb-6 text-xl opacity-90">立即體驗 SiteNear，讓工地管理更簡單</p>
              <div class="flex justify-center gap-4 sm:flex-row">
                <a
                  :href="BRAND_LINK.productionLogin"
                  target="_blank"
                  class="inline-flex items-center justify-center rounded-full bg-white px-8 py-4 text-lg font-semibold text-orange-500 shadow-lg transition-colors hover:bg-gray-100"
                >
                  直接體驗（不用登入）
                  <svg class="ml-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M13 7l5 5m0 0l-5 5m5-5H6"
                    />
                  </svg>
                </a>
                <router-link
                  to="/auth/login"
                  class="inline-flex items-center justify-center rounded-full border-2 border-white px-8 py-4 text-lg font-semibold transition-colors hover:bg-white hover:text-orange-500"
                >
                  立即註冊
                </router-link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </LandingLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue';

import { BRAND_LINK } from '@/constants/link';
import LandingLayout from '@/layouts/LandingLayout.vue';

const currentStep = ref(0);

const steps = [
  {
    id: 'step1',
    title: '拍照記錄',
    description: '用手機拍攝工地現場，自動上傳到雲端',
    demoText: '打開 SiteNear，對準工地拍照，一鍵記錄',
    features: ['支援照片和影片拍攝', '自動添加時間地點標記', '即時同步到所有設備'],
  },
  {
    id: 'step2',
    title: '標注重點',
    description: '在照片上標注重要資訊，添加文字說明',
    demoText: '在照片上畫圈、標注，添加重要說明',
    features: ['直觀的標注工具', '文字語音備註', '分類標籤管理'],
  },
  {
    id: 'step3',
    title: '生成報告',
    description: '自動整理成專業報告，分享給團隊',
    demoText: '一鍵生成報告，分享給客戶和團隊',
    features: ['自動生成進度報告', '成本分析圖表', '多格式匯出分享'],
  },
];
</script>

<style scoped>
.tutorial-section {
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
</style>
