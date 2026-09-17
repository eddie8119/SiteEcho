<template>
  <div class="safe-area-top-md sticky top-0 z-40 border-b border-gray-200 bg-white px-4 py-3">
    <div class="mx-auto flex max-w-4xl items-center justify-between">
      <ProjectSelector variant="timeline" />

      <div class="flex items-center gap-2">
        <BackupStatus />
        <router-link
          :to="{ name: 'mobile-setting' }"
          class="rounded-lg p-2 text-gray-600 hover:bg-gray-100"
        >
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.8"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';

import ProjectSelector from '@/components/project/ProjectSelector.vue';
import BackupStatus from '@/components/timeline/BackupStatus.vue';
import { useRegistrationFlow } from '@/composables/useRegistrationFlow';

const { updatePhotoCount } = useRegistrationFlow();

onMounted(async () => {
  await updatePhotoCount();
});
</script>

<style scoped>
/* No additional styles needed */
</style>
