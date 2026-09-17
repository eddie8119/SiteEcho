import { computed, type ComputedRef, ref, type Ref } from 'vue';
import { useI18n } from 'vue-i18n';

import type { GroupedPhotos, GroupedPhotosByProject, PhotoRecord } from '@/types/photo';
import type { ProjectResponse } from '@/types/response';

import { UNCATEGORIZED_FILTER } from '@/constants/tab';
import { PendingType, PhotoStatus } from '@/types/photo';
import { formatDate } from '@/utils/date';

interface UseDesktopPhotoFilterParams {
  photos: ComputedRef<PhotoRecord[] | undefined>;
  projects: Ref<ProjectResponse[] | undefined>;
  projectId: ComputedRef<string | undefined>;
}

export const useDesktopPhotoFilter = ({
  photos,
  projects,
  projectId,
}: UseDesktopPhotoFilterParams) => {
  const { t } = useI18n();

  const activeSpaceFilter = ref('all');
  const showOnlyPending = ref(false);
  const activePendingTypeFilter = ref<PendingType | typeof UNCATEGORIZED_FILTER | null>(null);

  const currentFilterName = computed(() => {
    if (showOnlyPending.value) {
      if (activePendingTypeFilter.value === UNCATEGORIZED_FILTER)
        return t('photo.desktop.page.filter_pending_uncategorized');
      if (activePendingTypeFilter.value === PendingType.ISSUE)
        return t('photo.desktop.page.filter_pending_issue');
      if (activePendingTypeFilter.value === PendingType.FIX)
        return t('photo.desktop.page.filter_pending_fix');
      if (activePendingTypeFilter.value === PendingType.CHECK)
        return t('photo.desktop.page.filter_pending_check');
      return t('photo.desktop.page.filter_pending');
    }
    if (activeSpaceFilter.value === 'all') return t('photo.desktop.page.filter_all');
    return activeSpaceFilter.value;
  });

  const filteredPhotos = computed(() => {
    if (!photos.value) return [];

    let result = photos.value;

    if (activeSpaceFilter.value !== 'all') {
      result = result.filter((p) => p.space === activeSpaceFilter.value);
    }

    if (showOnlyPending.value) {
      result = result.filter((p) => p.status === PhotoStatus.PENDING);

      if (activePendingTypeFilter.value) {
        if (activePendingTypeFilter.value === UNCATEGORIZED_FILTER) {
          result = result.filter(
            (p) =>
              !p.pendingType ||
              ![PendingType.ISSUE, PendingType.FIX, PendingType.CHECK].includes(p.pendingType)
          );
        } else {
          result = result.filter((p) => p.pendingType === activePendingTypeFilter.value);
        }
      }
    }

    return result;
  });

  const filteredPhotosCount = computed(() => filteredPhotos.value.length);

  const groupedPhotos = computed<(GroupedPhotos | GroupedPhotosByProject)[]>(() => {
    const grouped: Record<string, PhotoRecord[]> = {};
    const now = new Date();
    const todayKey = formatDate(now);

    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayKey = formatDate(yesterdayDate);

    filteredPhotos.value.forEach((photo: PhotoRecord) => {
      const dateKey = formatDate(photo.takenAt);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(photo);
    });

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([dateKey, photos]) => {
        let dateLabel = dateKey;
        if (dateKey === todayKey) dateLabel = t('photo.timeline.today');
        else if (dateKey === yesterdayKey) dateLabel = t('photo.timeline.yesterday');

        if (!projectId.value) {
          const projectGroups: Record<string, PhotoRecord[]> = {};
          photos.forEach((photo) => {
            const pid = photo.projectId;
            if (!projectGroups[pid]) {
              projectGroups[pid] = [];
            }
            projectGroups[pid].push(photo);
          });

          const sortedProjectGroups = Object.entries(projectGroups)
            .map(([pid, photos]) => {
              const project = projects.value?.find((p) => p.clientId === pid);
              return {
                projectId: pid,
                projectName: project?.name || t('photo.desktop.page.unknown_project'),
                photos: photos.sort(
                  (a: PhotoRecord, b: PhotoRecord) => b.takenAt.getTime() - a.takenAt.getTime()
                ),
              };
            })
            .sort((a, b) => a.projectName.localeCompare(b.projectName, 'zh-TW'));

          return {
            date: dateKey,
            dateLabel,
            projectGroups: sortedProjectGroups,
          };
        }

        return {
          date: dateKey,
          dateLabel,
          photos: photos.sort(
            (a: PhotoRecord, b: PhotoRecord) => b.takenAt.getTime() - a.takenAt.getTime()
          ),
        };
      });
  });

  return {
    activeSpaceFilter,
    showOnlyPending,
    activePendingTypeFilter,
    currentFilterName,
    filteredPhotos,
    filteredPhotosCount,
    groupedPhotos,
  };
};
