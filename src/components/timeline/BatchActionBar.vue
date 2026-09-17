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
        <div ref="moreMenuContainer" class="relative flex-1">
          <button
            class="w-full rounded-xl border border-gray-300 py-3 text-sm font-medium text-gray-700 hover:bg-orange-50 active:bg-gray-100"
            @click="showMoreMenu = !showMoreMenu"
          >
            <div class="flex flex-col items-center gap-1">
              <span
                class="flex h-6 items-center justify-center text-base leading-none text-brand-primary"
                >⋯</span
              >
              <span>{{ $t('nav.batchActionBar.more') }}</span>
            </div>
          </button>
          <div
            v-if="showMoreMenu"
            class="absolute bottom-full left-1/2 mb-2 w-28 -translate-x-1/2 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
          >
            <button
              v-for="item in menuItems"
              :key="item.label"
              class="flex w-full items-center justify-start gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-orange-50"
              @click="item.handler"
            >
              <img :src="item.icon" class="h-4 w-4" :alt="item.label" />
              <span>{{ item.label }}</span>
            </button>
          </div>
        </div>

        <TrashButton @click="emit('delete')" />
      </div>
    </template>
  </BaseBatchActionBar>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

import DownloadIcon from '@/assets/icons/Download.png';
import LocationIcon from '@/assets/icons/Location.png';
import ReportIcon from '@/assets/icons/Report.png';
import RestoreIcon from '@/assets/icons/Restore.png';
import ShareIcon from '@/assets/icons/Share.png';
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
  'generate-report': [];
  share: [];
  download: [];
  delete: [];
}>();

const { t } = useI18n();
const router = useRouter();

const showMoreMenu = ref(false);
const moreMenuContainer = ref<HTMLElement | null>(null);

interface ActionButton {
  icon: string;
  alt: string;
  label: string;
  emit: 'set-space' | 'set-construction' | 'share';
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
    icon: ShareIcon,
    alt: 'share',
    label: t('nav.batchActionBar.shareCrew'),
    emit: 'share',
  },
]);

interface MenuItem {
  icon: string;
  label: string;
  handler: () => void;
}

const menuItems = computed<MenuItem[]>(() => [
  {
    icon: DownloadIcon,
    label: t('nav.batchActionBar.saveToAlbum'),
    handler: () => {
      showMoreMenu.value = false;
      emit('download');
    },
  },
  {
    icon: ReportIcon,
    label: t('nav.batchActionBar.exportReport'),
    handler: () => {
      showMoreMenu.value = false;
      emit('generate-report');
    },
  },
  {
    icon: RestoreIcon,
    label: t('nav.batchActionBar.trash'),
    handler: () => {
      showMoreMenu.value = false;
      router.push('/mobile/trash');
    },
  },
]);

const handleClickOutside = (event: MouseEvent) => {
  if (moreMenuContainer.value && !moreMenuContainer.value.contains(event.target as Node)) {
    showMoreMenu.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>
