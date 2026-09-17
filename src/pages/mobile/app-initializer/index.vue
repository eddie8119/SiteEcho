<template>
  <div class="relative">
    <TextButton
      v-if="showFirstTimeSetup"
      class="absolute right-4 top-4 z-50"
      variant="primary"
      size="sm"
      @click="handleLogin"
    >
      {{ t('initialize.login_button') }}
    </TextButton>

    <FirstTimeProjectSetup v-if="showFirstTimeSetup" @project-created="handleFirstProjectCreated" />

    <!-- Loading State -->
    <div
      v-if="isInitializing"
      class="z-9998 fixed bottom-0 left-0 right-0 top-0 flex items-center justify-center bg-white/90"
    >
      <div class="flex flex-col items-center gap-4">
        <div class="h-8 w-8 animate-spin rounded-full border-3 border-gray-200 border-t-blue-500" />
        <p class="m-0 text-base text-gray-500">{{ t('initialize.initializing') }}</p>
      </div>
    </div>

    <!-- Default content when not initializing and no setup needed -->
    <div
      v-if="!isInitializing && !showFirstTimeSetup"
      class="flex h-screen items-center justify-center bg-white"
    >
      <div class="text-center">
        <p class="text-gray-500">{{ t('initialize.redirecting') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import type { Project } from '@/types/photo';

import TextButton from '@/components/core/button/TextButton.vue';
import FirstTimeProjectSetup from '@/components/project/FirstTimeProjectSetup.vue';
import { useCurrentProject } from '@/composables/useCurrentProject';

const { t } = useI18n();
const { initializeCurrentProject, isFirstTimeUser } = useCurrentProject();

const router = useRouter();
const isInitializing = ref(true);
const showFirstTimeSetup = ref(false);

const handleFirstProjectCreated = (_project: Project) => {
  showFirstTimeSetup.value = false;
  isInitializing.value = false;

  // 重定向到 timeline 頁面
  router.push('/mobile/timeline');
};

const handleLogin = () => {
  router.push('/auth/login');
};

const initializeApp = async () => {
  try {
    isInitializing.value = true;

    // Initialize current project state
    const currentProject = await initializeCurrentProject();

    if (!currentProject && isFirstTimeUser) {
      showFirstTimeSetup.value = true;
    } else if (currentProject) {
      router.replace('/mobile/timeline');
    } else {
      showFirstTimeSetup.value = true;
    }
  } catch (error) {
    console.error('Failed to initialize app:', error);
    // On error, show setup anyway
    showFirstTimeSetup.value = true;
  } finally {
    isInitializing.value = false;
  }
};

onMounted(() => {
  initializeApp();
});
</script>
