import { PhotoSyncLevel } from '@/types/photo';

export const usePhotoSampling = () => {
  /**
   * Determines the sync level and flags for a new photo
   */
  const determineSyncStrategy = async () => {
    // Disable automatic sampling for now
    // All photos default to Layer 1 (none)
    // Users can manually upgrade to Layer 2/3 as needed
    return {
      isEvidence: false,
      isSampled: false,
      syncLevel: PhotoSyncLevel.NONE,
    };
  };

  return {
    determineSyncStrategy,
  };
};
