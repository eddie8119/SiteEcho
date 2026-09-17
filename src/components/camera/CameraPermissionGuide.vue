<template>
  <div class="mx-auto max-w-md pt-4">
    <h3 class="mb-4 text-center text-lg font-semibold text-gray-900">相機無法使用？解決方案</h3>

    <div class="space-y-4">
      <!-- 原生 App -->
      <div v-if="isNative">
        <h4 class="mb-2 font-medium">App 環境</h4>
        <ol class="space-y-1 text-sm text-gray-700">
          <li>1. 開啟手機的「設定」應用程式</li>
          <li>2. 找到並點擊此應用程式</li>
          <li>3. 點擊「權限」或「Permissions」</li>
          <li>4. 找到「相機」權限</li>
          <li>5. 選擇「允許」或「Allow」</li>
          <li>6. 返回應用程式重新嘗試</li>
        </ol>
      </div>

      <!-- 瀏覽器環境 -->
      <div v-else class="space-y-4">
        <!-- 瀏覽器不支援 -->
        <div v-if="errorType === 'browser_not_supported'">
          <h4 class="mb-2 font-medium">瀏覽器不支援</h4>
          <p class="mb-2 text-sm text-gray-700">您的瀏覽器不支援相機功能，請嘗試：</p>
          <ul class="space-y-1 text-sm text-gray-700">
            <li>• 使用最新版本的 Chrome、Firefox 或 Safari</li>
            <li>• 如果在行動裝置上，建議下載原生 App</li>
            <li>• 確保瀏覽器已更新到最新版本</li>
          </ul>
        </div>

        <!-- iOS Safari -->
        <div v-else-if="device.isIOS">
          <h4 class="mb-2 font-medium">iOS Safari</h4>
          <ol class="space-y-1 text-sm text-gray-700">
            <li>1. 點擊網址列左側的鎖頭或位置圖示</li>
            <li>2. 選擇「設定」或「網站設定」</li>
            <li>3. 找到「相機」選項</li>
            <li>4. 選擇「允許」</li>
            <li>5. 重新整理頁面</li>
          </ol>
        </div>

        <!-- Android Chrome -->
        <div v-else-if="device.isAndroid">
          <h4 class="mb-2 font-medium">Android Chrome</h4>
          <ol class="space-y-1 text-sm text-gray-700">
            <li>1. 點擊網址列左側的 🔒 圖示</li>
            <li>2. 選擇「網站設定」</li>
            <li>3. 找到「相機」權限</li>
            <li>4. 選擇「允許」</li>
            <li>5. 重新載入頁面</li>
          </ol>
        </div>

        <!-- 桌面瀏覽器 -->
        <div v-else-if="device.isDesktop">
          <h4 class="mb-2 font-medium">桌面瀏覽器</h4>
          <ol class="space-y-1 text-sm text-gray-700">
            <li>1. 點擊網址列左側的 🔒 圖示</li>
            <li>2. 選擇「網站設定」或「Site settings」</li>
            <li>3. 找到「相機」權限</li>
            <li>4. 選擇「允許」</li>
            <li>5. 重新載入頁面</li>
          </ol>
        </div>

        <!-- 系統設定（僅在權限問題時顯示） -->
        <div v-if="errorType === 'permission_denied' && !device.isDesktop">
          <h4 class="mb-2 font-medium">系統設定</h4>
          <p class="mb-2 text-sm text-gray-700">如果瀏覽器設定無法解決：</p>
          <div class="space-y-1 text-sm text-gray-700">
            <p v-if="device.isIOS">
              <strong>iOS：</strong> 設定 → 隱私權與安全性 → 相機 → 允許此應用程式
            </p>
            <p v-if="device.isAndroid">
              <strong>Android：</strong> 設定 → 應用程式 → 瀏覽器 → 權限 → 相機 → 允許
            </p>
          </div>
        </div>
      </div>

      <!-- 快速檢查 -->
      <div>
        <h4 class="mb-2 font-medium">快速檢查</h4>
        <ul class="space-y-1 text-sm text-gray-700">
          <li>• 確保使用 HTTPS 連線</li>
          <li>• 關閉其他可能使用相機的應用程式</li>
          <li>• 重新啟動瀏覽器或 App</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core';
import { computed } from 'vue';

import { detectDevice } from '@/utils/deviceDetector';

interface Props {
  errorType?: string;
}

withDefaults(defineProps<Props>(), {
  errorType: 'permission_denied',
});

defineEmits<{
  retry: [];
  close: [];
}>();

const device = detectDevice();
const isNative = computed(() => Capacitor.isNativePlatform());
</script>

<style scoped>
ol,
ul {
  margin-left: 0;
  padding-left: 1.25rem;
}

li {
  text-align: left;
}
</style>
