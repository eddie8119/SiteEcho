import { v4 as uuidv4 } from 'uuid';
import { onMounted, ref } from 'vue';

import { type PhotoShare, type ShareTarget } from '@/types/photo';
import { addShareToPhotosInIndexedDB } from '@/utils/indexedDB';

const RECENT_TARGETS_KEY = 'SiteNear_recent_share_targets';
const MAX_RECENT_TARGETS = 5;

export const useShareRecord = () => {
  const recentTargets = ref<ShareTarget[]>([]);

  const loadRecentTargets = () => {
    const saved = localStorage.getItem(RECENT_TARGETS_KEY);
    if (saved) {
      try {
        recentTargets.value = JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse recent targets', e);
        recentTargets.value = [];
      }
    }
  };

  const saveRecentTarget = (target: ShareTarget) => {
    // Remove if already exists (to move to front)
    const filtered = recentTargets.value.filter(
      (t) =>
        t.role === target.role && t.trade === target.trade && t.displayName === target.displayName
    );

    const newList = [target, ...recentTargets.value.filter((t) => !filtered.includes(t))].slice(
      0,
      MAX_RECENT_TARGETS
    );
    recentTargets.value = newList;
    localStorage.setItem(RECENT_TARGETS_KEY, JSON.stringify(newList));
  };

  const recordShare = async (photoIds: string[], target: ShareTarget) => {
    const shareRecord: PhotoShare = {
      id: uuidv4(),
      ...target,
      createdAt: new Date(),
    };

    await addShareToPhotosInIndexedDB(photoIds, shareRecord);
    saveRecentTarget(target);
  };

  onMounted(loadRecentTargets);

  return {
    recentTargets,
    recordShare,
    loadRecentTargets,
  };
};
