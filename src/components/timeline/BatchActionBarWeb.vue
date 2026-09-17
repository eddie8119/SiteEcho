<template>
  <BaseBatchActionBar
    :is-visible="isVisible"
    :count="count"
    :summary="summary"
    @cancel="emit('cancel')"
  >
    <template #actions>
      <div class="flex gap-2">
        <button
          v-for="action in actionButtons"
          :key="action.label"
          class="flex-1 rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 active:bg-gray-100"
          @click="(emit as any)(action.emit)"
        >
          <div class="flex flex-col items-center gap-1">
            <img :src="action.icon" :alt="action.alt" class="h-6 w-6" />
            <span>{{ action.label }}</span>
          </div>
        </button>

        <TrashButton @click="emit('delete')" />
      </div>
    </template>
  </BaseBatchActionBar>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import DownloadIcon from '@/assets/icons/Download.png';
import LocationIcon from '@/assets/icons/Location.png';
import WrenchIcon from '@/assets/icons/Wrench.png';
import BaseBatchActionBar from '@/components/core/BaseBatchActionBar.vue';
import TrashButton from '@/components/ui/TrashButton.vue';

defineProps<{
  isVisible: boolean;
  count: number;
  summary: string;
}>();

const emit = defineEmits<{
  cancel: [];
  'set-space': [];
  'set-construction': [];
  download: [];
  delete: [];
}>();

const { t } = useI18n();

interface ActionButton {
  icon: string;
  alt: string;
  label: string;
  emit: 'set-space' | 'set-construction' | 'download';
}

const actionButtons = computed<ActionButton[]>(() => [
  {
    icon: LocationIcon,
    alt: 'Location',
    label: t('nav.batchActionBar.setSpace'),
    emit: 'set-space',
  },
  {
    icon: WrenchIcon,
    alt: 'Wrench',
    label: t('nav.batchActionBar.setConstruction'),
    emit: 'set-construction',
  },
  {
    icon: DownloadIcon,
    alt: 'Download',
    label: t('nav.batchActionBar.saveToAlbum'),
    emit: 'download',
  },
]);
</script>
