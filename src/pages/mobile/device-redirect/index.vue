<template>
  <div class="flex h-screen items-center justify-center">
    <Loading />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

import Loading from '@/components/core/loading/Loading.vue';
import { isAccessTokenValid } from '@/utils/auth';
import { shouldUseMobileLayout } from '@/utils/deviceDetector';
import { getProjectsFromIndexedDB } from '@/utils/indexedDB';

const router = useRouter();

onMounted(async () => {
  try {
    // 根據設備類型自動重定向
    const useMobile = shouldUseMobileLayout();

    if (useMobile) {
      // 檢查是否為首次用戶
      const projects = await getProjectsFromIndexedDB();

      // 如果沒有任何專案，重定向到 app-initializer
      if (projects.length === 0) {
        router.replace('/app-initializer');
        return;
      }

      // 如果已有專案，直接進入 timeline
      router.replace('/mobile/timeline');
      return;
    }

    // 桌面端根據登入狀態重定向
    const hasValidToken = isAccessTokenValid();
    if (hasValidToken) {
      router.replace('/desktop/overview');
    } else {
      router.replace('/auth/login');
    }
  } catch (error) {
    // 錯誤情況下預設到登入頁
    router.replace('/auth/login');
  }
});
</script>
