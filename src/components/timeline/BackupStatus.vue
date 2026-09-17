<template>
  <div v-if="syncablePhotoCount > 0" class="flex max-w-[200px] items-center">
    <!-- Rule 1: Not Logged In -->
    <div
      v-if="!isAuthenticated"
      class="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-600"
    >
      <span>
        {{
          t('timeline.state.sync_status.not_backed_up', {
            count: syncablePhotoCount,
            total: photoCount,
          })
        }}
      </span>
    </div>

    <!-- Rule 2: Logged In (regardless of subscription) -->
    <template v-else>
      <div
        v-if="queuedSyncScheduled && !queuedSyncing"
        class="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600"
      >
        <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>{{ t('timeline.state.sync_status.pending', { count: queuedSyncCount }) }}</span>
      </div>
      <div
        v-else-if="isSyncing || queuedSyncing"
        class="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-medium text-blue-600"
      >
        <svg class="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span>
          {{
            t('timeline.state.sync_status.syncing', {
              synced: syncProgress.synced,
              total: syncProgress.total,
            })
          }}
        </span>
      </div>
      <div
        v-else-if="!isWifi"
        class="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-600"
      >
        <span>{{
          t('timeline.state.sync_status.not_backed_up_waiting_wifi', {
            count: unsyncedPhotoCount,
            total: photoCount,
          })
        }}</span>
      </div>
      <div
        v-else-if="unsyncedPhotoCount > 0"
        class="flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-[11px] font-medium text-orange-600"
      >
        <span>{{
          t('timeline.state.sync_status.not_backed_up', {
            count: unsyncedPhotoCount,
            total: photoCount,
          })
        }}</span>
      </div>
      <div v-else class="flex flex-col items-start gap-0.5">
        <div
          class="flex items-center gap-1 rounded-full bg-green-50 px-3 py-0.5 text-[11px] font-medium text-green-600"
        >
          <span>{{ t('timeline.state.sync_status.synced') }}</span>
        </div>
        <span class="max-w-[130px] text-wrap text-[9px] text-gray-400">
          {{ formatStorage(limits.usedStorageBytes) }} /
          {{ formatStorage(limits.storageLimitBytes) }}
        </span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { formatStorage } from '@/utils/storage';

const { t } = useI18n();
const queuedSyncCount = ref(0);
const queuedSyncScheduled = ref(false);
const queuedSyncing = ref(false);

const {
  isAuthenticated,
  isWifi,
  photoCount,
  syncablePhotoCount,
  isSyncing,
  syncProgress,
  unsyncedPhotoCount,
  limits,
  updatePhotoCount,
} = useRegistrationFlow();

const handlePhotoSyncCompleted = () => {
  void updatePhotoCount();
};

const handlePhotoSyncStatusChanged = (event: Event) => {
  const { detail } = event as CustomEvent<{
    pendingCount: number;
    isSyncing: boolean;
    isScheduled: boolean;
  }>;
  queuedSyncCount.value = detail.pendingCount;
  queuedSyncing.value = detail.isSyncing;
  queuedSyncScheduled.value = detail.isScheduled;
};

onMounted(() => {
  window.addEventListener('photo-sync-completed', handlePhotoSyncCompleted);
  window.addEventListener('photo-sync-status-changed', handlePhotoSyncStatusChanged);
});

onUnmounted(() => {
  window.removeEventListener('photo-sync-completed', handlePhotoSyncCompleted);
  window.removeEventListener('photo-sync-status-changed', handlePhotoSyncStatusChanged);
});
</script>
