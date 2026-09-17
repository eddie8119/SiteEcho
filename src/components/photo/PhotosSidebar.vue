<template>
  <div class="w-64 flex-shrink-0 border-r border-gray-200 bg-white">
    <div class="flex h-full flex-col">
      <div class="border-b border-gray-100">
        <H2Title :title="$t('photo.sidebar.filter')" />
      </div>

      <div class="flex-1 overflow-y-auto p-4">
        <nav class="space-y-1">
          <button
            v-for="filter in spaceFilters"
            :key="filter.id"
            class="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            :class="[
              modelValue.activeSpaceFilter === filter.id
                ? 'bg-brand-primary/10 text-brand-primary'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            ]"
            @click="$emit('update:activeSpaceFilter', filter.id)"
          >
            <div class="flex items-center">
              <img
                v-if="typeof filter.icon === 'string' && filter.icon.startsWith('/')"
                :src="filter.icon"
                class="mr-3 h-5 w-5"
                alt=""
              />
              <span v-else class="mr-3">{{ filter.icon }}</span>
              <span>{{ filter.name }}</span>
            </div>
            <span
              v-if="filter.count > 0"
              class="ml-3 rounded-full px-2 py-0.5 text-xs font-semibold"
              :class="[
                modelValue.activeSpaceFilter === filter.id
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'bg-gray-100 text-gray-500',
              ]"
            >
              {{ filter.count }}
            </span>
          </button>
        </nav>

        <div class="mt-8 border-t border-gray-100 pt-8">
          <h3 class="px-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            {{ $t('photo.sidebar.statusFilter') }}
          </h3>
          <div class="mt-4 space-y-1">
            <button
              class="group flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              :class="[
                modelValue.showOnlyPending
                  ? 'bg-brand-primary/10 text-brand-primary'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ]"
              @click="handlePendingToggle"
            >
              <div class="flex items-center">
                <span class="mr-3">⚠</span>
                <span>{{ $t('photo.sidebar.pending') }}</span>
              </div>
              <span
                v-if="pendingCount > 0"
                class="ml-3 rounded-full px-2 py-0.5 text-xs font-semibold"
                :class="[
                  modelValue.showOnlyPending
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'bg-gray-100 text-gray-500',
                ]"
              >
                {{ pendingCount }}
              </span>
            </button>

            <!-- Pending Type Sub-filters -->
            <div class="ml-4 mt-1 space-y-1 border-l-2 border-gray-200 pl-3">
              <button
                v-for="type in pendingTypes"
                :key="type.value"
                class="group flex w-full items-center justify-between rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                :class="[
                  modelValue.activePendingTypeFilter === type.value && modelValue.showOnlyPending
                    ? 'bg-brand-primary/10 text-brand-primary'
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700',
                ]"
                @click="handlePendingTypeClick(type.value)"
              >
                <span>{{ type.label }}</span>
                <span
                  v-if="type.count > 0"
                  class="rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                  :class="[
                    modelValue.activePendingTypeFilter === type.value && modelValue.showOnlyPending
                      ? 'bg-brand-primary/10 text-brand-primary'
                      : 'bg-gray-100 text-gray-400',
                  ]"
                >
                  {{ type.count }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="border-t border-gray-100 p-4">
        <RefreshButton
          :is-loading="isRefetching || isLoadingPhotos"
          full-width
          @click="handleRefetch"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import locationIcon from '@/assets/icons/Location.png';
import photoIcon from '@/assets/icons/Photo.png';
import RefreshButton from '@/components/core/button/RefreshButton.vue';
import H2Title from '@/components/core/title/H2Title.vue';
import { UNCATEGORIZED_FILTER } from '@/constants/tab';
import { PendingType, type PhotoRecord, PhotoStatus } from '@/types/photo';

interface SidebarState {
  activeSpaceFilter: string;
  showOnlyPending: boolean;
  activePendingTypeFilter: PendingType | typeof UNCATEGORIZED_FILTER | null;
}

interface Props {
  modelValue: SidebarState;
  photos: PhotoRecord[] | undefined;
  isLoadingPhotos: boolean;
}

interface Emits {
  (e: 'update:activeSpaceFilter', value: string): void;
  (e: 'update:showOnlyPending', value: boolean): void;
  (
    e: 'update:activePendingTypeFilter',
    value: PendingType | typeof UNCATEGORIZED_FILTER | null
  ): void;
  (e: 'refetch'): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();
const { t } = useI18n();

const isRefetching = ref(false);

const handleRefetch = async () => {
  isRefetching.value = true;
  emit('refetch');
  // Add a brief delay to show visual feedback
  setTimeout(() => {
    isRefetching.value = false;
  }, 1000);
};

// Available spaces derived from photos
const availableSpaces = computed(() => {
  const spaces = new Set<string>();
  props.photos?.forEach((p) => {
    if (p.space) spaces.add(p.space);
  });
  return Array.from(spaces).sort();
});

// Sidebar filters configuration
const spaceFilters = computed(() => {
  const filters = [
    {
      id: 'all',
      name: t('photo.sidebar.allPhotos'),
      icon: photoIcon,
      count: props.photos?.length || 0,
    },
  ];

  availableSpaces.value.forEach((space) => {
    const count = props.photos?.filter((p) => p.space === space).length || 0;
    filters.push({
      id: space,
      name: space,
      icon: locationIcon,
      count,
    });
  });

  return filters;
});

const handlePendingToggle = () => {
  if (!props.modelValue.showOnlyPending) {
    // Enable pending filter
    emit('update:showOnlyPending', true);
  } else {
    // Disable pending filter
    emit('update:showOnlyPending', false);
    emit('update:activePendingTypeFilter', null);
  }
};

const handlePendingTypeClick = (pendingType: string) => {
  if (pendingType === UNCATEGORIZED_FILTER) {
    emit('update:activePendingTypeFilter', UNCATEGORIZED_FILTER);
  } else if (Object.values(PendingType).includes(pendingType as PendingType)) {
    emit('update:activePendingTypeFilter', pendingType as PendingType);
  }
};

const pendingCount = computed(() => {
  if (!props.photos) return 0;
  return props.photos.filter((p) => p.status === PhotoStatus.PENDING).length;
});

const pendingTypes = computed(() => {
  if (!props.photos) return [];

  const pendingPhotos = props.photos.filter((p) => p.status === PhotoStatus.PENDING);

  const types = [
    {
      value: 'uncategorized',
      label: t('tab.pendingPhotos.none'),
      count: pendingPhotos.filter(
        (p) =>
          !p.pendingType ||
          ![PendingType.ISSUE, PendingType.FIX, PendingType.CHECK].includes(p.pendingType)
      ).length,
    },
    {
      value: PendingType.ISSUE,
      label: t('tab.pendingPhotos.issue'),
      count: pendingPhotos.filter((p) => p.pendingType === PendingType.ISSUE).length,
    },
    {
      value: PendingType.FIX,
      label: t('tab.pendingPhotos.fix'),
      count: pendingPhotos.filter((p) => p.pendingType === PendingType.FIX).length,
    },
    {
      value: PendingType.CHECK,
      label: t('tab.pendingPhotos.check'),
      count: pendingPhotos.filter((p) => p.pendingType === PendingType.CHECK).length,
    },
  ];

  return types;
});
</script>
