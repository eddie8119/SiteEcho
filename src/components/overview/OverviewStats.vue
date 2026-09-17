<template>
  <div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
    <component
      :is="card.is"
      v-for="card in statCards"
      :key="card.id"
      v-bind="card.props"
      :class="card.className"
    >
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-gray-500">{{ card.title }}</p>
          <component :is="card.valueComponent" v-if="card.valueComponent" />
          <p v-else class="mt-2 text-4xl font-bold text-gray-900">{{ card.value }}</p>
        </div>
        <div class="bg-brand-primary/10 flex h-14 w-14 items-center justify-center rounded-full">
          <svg
            class="h-7 w-7 text-brand-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              :d="card.iconPath"
            />
          </svg>
        </div>
      </div>
      <div v-if="card.footer" class="mt-4 flex items-center text-sm text-gray-600">
        <span class="font-medium text-brand-primary">{{ card.footer }}</span>
      </div>
    </component>
  </div>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';
import { useI18n } from 'vue-i18n';

import type { RemotePhoto } from '@/api/photo';

import StorageUsage from '@/components/billing/StorageUsage.vue';
import { PhotoStatus } from '@/types/photo';

// Props
interface Props {
  photos?: RemotePhoto[];
}

const props = withDefaults(defineProps<Props>(), {
  photos: () => [],
});

const { t } = useI18n();

// Computed properties
const photoCount = computed(() => props.photos?.length || 0);

const pendingPhotoCount = computed(() => {
  if (!props.photos) return 0;
  return props.photos.filter((p) => p.status === PhotoStatus.PENDING).length;
});

// Stat cards data
const statCards = computed(() => [
  {
    id: 'pending',
    is: 'router-link',
    props: { to: '/desktop/photos?filter=pending' },
    className:
      'block rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md',
    title: t('overview.stats.pending_photos'),
    value: pendingPhotoCount.value,
    iconPath:
      'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    footer: t('overview.stats.pending_footer', { count: pendingPhotoCount.value }),
  },
  {
    id: 'total',
    is: 'div',
    props: {},
    className: 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
    title: t('overview.stats.total_photos'),
    value: props.photos?.length ?? 0,
    iconPath:
      'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z',
    footer: t('overview.stats.total_footer', { photoCount: photoCount.value }),
  },
  {
    id: 'storage',
    is: 'div',
    props: {},
    className: 'rounded-xl border border-gray-200 bg-white p-6 shadow-sm',
    title: t('overview.stats.cloud_usage'),
    valueComponent: h(StorageUsage),
    iconPath:
      'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    footer: null,
  },
]);
</script>
