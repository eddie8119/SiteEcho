import { computed, ref, type Ref } from 'vue';
import { useRouter } from 'vue-router';

import type { LocalPhoto, PhotoRecord } from '@/types/photo';

import { useRegistrationFlow } from '@/composables/useRegistrationFlow';
import { PhotoSyncLevel, SyncStatus } from '@/types/photo';
import { AnalyticsEvent, track } from '@/utils/analytics';
import { updatePhotoInIndexedDB } from '@/utils/indexedDB';

export enum EvidenceAction {
  Trash = 'trash',
  Permanent = 'permanent',
}

const LONG_PRESS_DURATION = 500;

export const useTimelineMultiSelect = (localPhotos: Ref<LocalPhoto[]>) => {
  const router = useRouter();
  const isMultiSelectMode = ref(false);
  const selectedPhotos = ref<Set<string>>(new Set());
  const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);
  const showDeleteConfirm = ref(false);

  const { updatePhotoCount } = useRegistrationFlow();

  const handlePhotoMouseDown = (photo: LocalPhoto | PhotoRecord) => {
    longPressTimer.value = setTimeout(() => {
      isMultiSelectMode.value = true;
      selectedPhotos.value.add(photo.id);
    }, LONG_PRESS_DURATION);
  };

  const handlePhotoMouseUp = () => {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  const handlePhotoTouchStart = (photo: LocalPhoto | PhotoRecord) => {
    longPressTimer.value = setTimeout(() => {
      isMultiSelectMode.value = true;
      selectedPhotos.value.add(photo.id);
    }, LONG_PRESS_DURATION);
  };

  const handlePhotoTouchEnd = () => {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  const handlePhotoClick = (photo: LocalPhoto | PhotoRecord) => {
    if (isMultiSelectMode.value) {
      if (selectedPhotos.value.has(photo.id)) {
        selectedPhotos.value.delete(photo.id);
        if (selectedPhotos.value.size === 0) {
          isMultiSelectMode.value = false;
        }
      } else {
        selectedPhotos.value.add(photo.id);
      }
    } else {
      router.push({ name: 'photo-edit', params: { id: photo.id } });
    }
  };

  const selectionSummary = computed(() => {
    if (selectedPhotos.value.size === 0) return '';
    const selected = localPhotos.value.filter((p) => selectedPhotos.value.has(p.id));
    const counts: Record<string, number> = {};
    let unclassified = 0;
    selected.forEach((p) => {
      if (p.space) {
        counts[p.space] = (counts[p.space] || 0) + 1;
      } else {
        unclassified++;
      }
    });
    const parts = Object.entries(counts).map(([space, n]) => `${n} 張${space}`);
    if (unclassified > 0) parts.push(`${unclassified} 張未分類`);
    return parts.join(' / ');
  });

  const clearSelection = () => {
    selectedPhotos.value.clear();
    isMultiSelectMode.value = false;
  };

  const requestDelete = () => {
    if (selectedPhotos.value.size > 0) {
      showDeleteConfirm.value = true;
    }
  };

  const executeDelete = async (evidenceAction: EvidenceAction = EvidenceAction.Trash) => {
    if (selectedPhotos.value.size === 0) return;
    try {
      const selected = localPhotos.value.filter((p) => selectedPhotos.value.has(p.id));
      const regularPhotos = selected.filter((p) => !p.isEvidence);
      const evidencePhotos = selected.filter((p) => p.isEvidence);

      // Regular photos (Layer1): direct delete (no cloud sync, no recovery needed)
      await Promise.all(
        regularPhotos.map((p) => updatePhotoInIndexedDB(p.id, { isDeleted: true }))
      );

      if (evidenceAction === EvidenceAction.Trash) {
        // Evidence photos (Layer2~3): soft delete with trashedAt for 30-day recovery
        await Promise.all(
          evidencePhotos.map((p) =>
            updatePhotoInIndexedDB(p.id, { isDeleted: true, trashedAt: new Date() })
          )
        );
      } else {
        // Evidence photos: permanent delete (no trashedAt, sync will delete from cloud)
        await Promise.all(
          evidencePhotos.map((p) => updatePhotoInIndexedDB(p.id, { isDeleted: true }))
        );
      }

      localPhotos.value = localPhotos.value.filter((photo) => !selectedPhotos.value.has(photo.id));
      await updatePhotoCount();
      track(AnalyticsEvent.BATCH_USED);
      clearSelection();
    } catch (error) {
      console.error('Failed to delete photos:', error);
    } finally {
      showDeleteConfirm.value = false;
    }
  };

  const batchSetSpace = async (spaceName: string | null) => {
    const photoIds = Array.from(selectedPhotos.value);
    await Promise.all(
      photoIds.map((id) => {
        const photo = localPhotos.value.find((p) => p.id === id);
        const needsSync =
          photo &&
          (photo.syncLevel === PhotoSyncLevel.THUMBNAIL ||
            photo.syncLevel === PhotoSyncLevel.EVIDENCE ||
            photo.isEvidence);

        return updatePhotoInIndexedDB(id, {
          space: spaceName,
          ...(needsSync && {
            syncStatus: SyncStatus.PENDING,
            isDirty: true,
          }),
        });
      })
    );
    localPhotos.value = localPhotos.value.map((p) =>
      selectedPhotos.value.has(p.id) ? { ...p, space: spaceName } : p
    );
    track(AnalyticsEvent.BATCH_USED);
  };

  const batchSetConstruction = async (constructionNames: string[] | string | null) => {
    const photoIds = Array.from(selectedPhotos.value);
    const newConstructions = Array.isArray(constructionNames)
      ? constructionNames
      : constructionNames
        ? [constructionNames]
        : [];

    // Get current photos and merge constructions (append mode with deduplication)
    const photoUpdates = photoIds.map((id) => {
      const photo = localPhotos.value.find((p) => p.id === id);
      const existingConstructions = photo?.constructions || [];
      // Merge and deduplicate
      const constructions = [...new Set([...existingConstructions, ...newConstructions])];
      return { id, constructions };
    });

    await Promise.all(
      photoUpdates.map(({ id, constructions }) => {
        const photo = localPhotos.value.find((p) => p.id === id);
        const needsSync =
          photo &&
          (photo.syncLevel === PhotoSyncLevel.THUMBNAIL ||
            photo.syncLevel === PhotoSyncLevel.EVIDENCE ||
            photo.isEvidence);

        return updatePhotoInIndexedDB(id, {
          constructions,
          ...(needsSync && {
            syncStatus: SyncStatus.PENDING,
            isDirty: true,
          }),
        });
      })
    );

    localPhotos.value = localPhotos.value.map((p) => {
      const update = photoUpdates.find((u) => u.id === p.id);
      return update ? { ...p, constructions: update.constructions } : p;
    });

    track(AnalyticsEvent.BATCH_USED);
  };

  return {
    isMultiSelectMode,
    selectedPhotos,
    selectionSummary,
    showDeleteConfirm,
    handlePhotoMouseDown,
    handlePhotoMouseUp,
    handlePhotoTouchStart,
    handlePhotoTouchEnd,
    handlePhotoClick,
    clearSelection,
    requestDelete,
    executeDelete,
    batchSetSpace,
    batchSetConstruction,
  };
};
