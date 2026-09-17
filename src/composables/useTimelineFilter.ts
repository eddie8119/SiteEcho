import { computed, ref } from 'vue';

import type { PhotoFilterType } from '@/types/filter';
import type { LocalPhoto, PhotoStatus } from '@/types/photo';
import type { Ref } from 'vue';

import { AnalyticsEvent, track } from '@/utils/analytics';

export interface FilterState {
  space: string | null;
  construction: string | null;
  status: PhotoStatus | null;
  searchText: string;
}

export const useTimelineFilter = (photos: Ref<LocalPhoto[]>) => {
  const filters = ref<FilterState>({
    space: null,
    construction: null,
    status: null,
    searchText: '',
  });

  const filteredPhotos = computed(() => {
    return photos.value.filter((photo) => {
      // Space filter
      if (filters.value.space && photo.space !== filters.value.space) {
        return false;
      }

      // Construction filter
      if (
        filters.value.construction &&
        (!photo.constructions || !photo.constructions.includes(filters.value.construction))
      ) {
        return false;
      }

      // Status filter
      if (filters.value.status && photo.status !== filters.value.status) {
        return false;
      }

      // Search text filter (match space, constructions, or note)
      if (filters.value.searchText) {
        const searchLower = filters.value.searchText.toLowerCase();
        const matchSpace = photo.space?.toLowerCase().includes(searchLower);
        const matchConstruction = photo.constructions?.some((c) =>
          c.toLowerCase().includes(searchLower)
        );
        const matchNote = photo.note?.toLowerCase().includes(searchLower);

        if (!matchSpace && !matchConstruction && !matchNote) {
          return false;
        }
      }

      return true;
    });
  });

  const activeFilters = computed(() => {
    const active: Array<{ type: PhotoFilterType; value: string }> = [];

    if (filters.value.space) {
      active.push({ type: 'space', value: filters.value.space });
    }
    if (filters.value.construction) {
      active.push({ type: 'construction', value: filters.value.construction });
    }
    if (filters.value.status) {
      active.push({ type: 'status', value: filters.value.status });
    }

    return active;
  });

  const hasActiveFilters = computed(() => activeFilters.value.length > 0);

  const addSpaceFilter = (space: string) => {
    filters.value.space = space;
    track(AnalyticsEvent.FILTER_USED);
  };

  const addConstructionFilter = (construction: string) => {
    filters.value.construction = construction;
    track(AnalyticsEvent.FILTER_USED);
  };

  const addStatusFilter = (status: PhotoStatus) => {
    filters.value.status = status;
    track(AnalyticsEvent.FILTER_USED);
  };

  const setSearchText = (searchText: string) => {
    filters.value.searchText = searchText;
    track(AnalyticsEvent.FILTER_USED);
  };

  const removeFilter = (type: PhotoFilterType) => {
    filters.value[type] = null;
    track(AnalyticsEvent.FILTER_USED);
  };

  const clearAllFilters = () => {
    filters.value = {
      space: null,
      construction: null,
      status: null,
      searchText: '',
    };
    track(AnalyticsEvent.FILTER_USED);
  };

  return {
    filters,
    filteredPhotos,
    activeFilters,
    hasActiveFilters,
    addSpaceFilter,
    addConstructionFilter,
    addStatusFilter,
    setSearchText,
    removeFilter,
    clearAllFilters,
  };
};
