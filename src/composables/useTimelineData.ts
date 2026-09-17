import { computed, ref } from 'vue';

import type { GroupedPhotos, PhotoRecord } from '@/types/photo';

import { PhotoStatus } from '@/types/photo';

export function useTimelineData() {
  const showPendingOnly = ref(false);

  const allPhotos = ref<PhotoRecord[]>([]);

  const filteredPhotos = computed(() => {
    if (showPendingOnly.value) {
      return allPhotos.value.filter((photo) => photo.status === PhotoStatus.PENDING);
    }
    return allPhotos.value;
  });

  const groupedPhotos = computed(() => {
    const grouped: Record<string, PhotoRecord[]> = {};
    const now = new Date();

    filteredPhotos.value.forEach((photo) => {
      const photoDate = new Date(photo.takenAt);
      const dateKey = photoDate.toISOString().split('T')[0];

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(photo);
    });

    // Sort by date descending and create labels
    const result: GroupedPhotos[] = Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([dateKey, photos]) => {
        const date = new Date(dateKey + 'T00:00:00');
        const todayKey = now.toISOString().split('T')[0];
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayKey = yesterdayDate.toISOString().split('T')[0];

        let dateLabel = date.toLocaleDateString('zh-TW', {
          month: 'numeric',
          day: 'numeric',
        });

        if (dateKey === todayKey) {
          dateLabel = '📅 今天';
        } else if (dateKey === yesterdayKey) {
          dateLabel = '📅 昨天';
        } else {
          dateLabel = `📅 ${dateLabel}`;
        }

        return {
          date: dateKey,
          dateLabel,
          photos: photos.sort(
            (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
          ),
        };
      });

    return result;
  });

  const togglePendingFilter = () => {
    showPendingOnly.value = !showPendingOnly.value;
  };

  const markAsComplete = (photoId: string) => {
    const photo = allPhotos.value.find((p) => p.id === photoId);
    if (photo) {
      photo.status = PhotoStatus.NORMAL;
    }
  };

  return {
    allPhotos,
    filteredPhotos,
    groupedPhotos,
    showPendingOnly,
    togglePendingFilter,
    markAsComplete,
  };
}
