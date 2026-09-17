import { computed, ref, type Ref } from 'vue';

import type { LocalPhoto } from '@/types/photo';

import { formatDate } from '@/utils/date';
import { getAllPhotosFromIndexedDB } from '@/utils/indexedDB';

export const useTimelinePhotosSource = () => {
  const localPhotos = ref<LocalPhoto[]>([]);

  const loadLocalPhotos = async () => {
    try {
      // Add a small delay to ensure IndexedDB transactions are completed
      await new Promise((resolve) => setTimeout(resolve, 100));
      const photos = await getAllPhotosFromIndexedDB();
      localPhotos.value = photos;
    } catch (error) {
      console.error('Failed to load local photos:', error);
    }
  };

  return {
    localPhotos,
    loadLocalPhotos,
  };
};

interface UseMobileTimelinePhotoViewParams {
  localPhotos: Ref<LocalPhoto[]>;
  filterResult: Ref<LocalPhoto[]>;
  currentProjectId: Ref<string | null | undefined>;
  statusFilter: Ref<'all' | 'pending' | 'resolved'>;
}

export const useMobileTimelinePhotoView = ({
  localPhotos,
  filterResult,
  currentProjectId,
  statusFilter,
}: UseMobileTimelinePhotoViewParams) => {
  const isFollowUpPhoto = (photo: LocalPhoto) => Boolean(photo.parentPhotoId);

  const pendingCount = computed(() => {
    let photos = localPhotos.value;
    if (currentProjectId.value) {
      photos = photos.filter((photo) => photo.projectId === currentProjectId.value);
    }
    return photos.filter((photo) => photo.status === 'pending' && !isFollowUpPhoto(photo)).length;
  });

  const resolvedCount = computed(() => {
    let photos = localPhotos.value;
    if (currentProjectId.value) {
      photos = photos.filter((photo) => photo.projectId === currentProjectId.value);
    }
    return photos.filter((photo) => photo.status === 'resolved' && !isFollowUpPhoto(photo)).length;
  });

  const filteredPhotos = computed(() => {
    let photos = filterResult.value;

    if (currentProjectId.value) {
      photos = photos.filter((photo) => photo.projectId === currentProjectId.value);
    }

    photos = photos.filter((photo) => !isFollowUpPhoto(photo));

    if (statusFilter.value === 'pending') {
      photos = photos.filter((photo) => photo.status === 'pending');
    } else if (statusFilter.value === 'resolved') {
      photos = photos.filter((photo) => photo.status === 'resolved');
    }

    return photos;
  });

  const followUpPhotosByParentId = computed<Record<string, LocalPhoto[]>>(() => {
    const grouped: Record<string, LocalPhoto[]> = {};

    const photos = currentProjectId.value
      ? localPhotos.value.filter((photo) => photo.projectId === currentProjectId.value)
      : localPhotos.value;

    // Filter out deleted photos
    const activePhotos = photos.filter((photo) => !photo.isDeleted);

    activePhotos.forEach((photo) => {
      if (!photo.parentPhotoId) return;

      if (!grouped[photo.parentPhotoId]) {
        grouped[photo.parentPhotoId] = [];
      }

      grouped[photo.parentPhotoId].push(photo);
    });

    Object.keys(grouped).forEach((parentPhotoId) => {
      grouped[parentPhotoId].sort(
        (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
      );
    });

    return grouped;
  });

  const groupedLocalPhotos = computed(() => {
    const grouped: Record<string, LocalPhoto[]> = {};
    const now = new Date();

    filteredPhotos.value.forEach((photo) => {
      const photoDate = new Date(photo.takenAt);
      const dateKey = formatDate(photoDate);

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(photo);
    });

    return Object.entries(grouped)
      .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
      .map(([dateKey, photos]) => {
        const date = new Date(`${dateKey}T00:00:00`);
        const todayKey = formatDate(now);
        const yesterdayDate = new Date(now);
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterdayKey = formatDate(yesterdayDate);

        let dateLabel = date.toLocaleDateString(undefined, {
          month: 'numeric',
          day: 'numeric',
        });

        if (dateKey === todayKey) {
          dateLabel = `${dateLabel} - 今天`;
        } else if (dateKey === yesterdayKey) {
          dateLabel = `${dateLabel} - 昨天`;
        }

        return {
          date: dateKey,
          dateLabel,
          photos: photos.sort(
            (a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()
          ),
        };
      });
  });

  return {
    pendingCount,
    resolvedCount,
    filteredPhotos,
    groupedLocalPhotos,
    followUpPhotosByParentId,
  };
};
