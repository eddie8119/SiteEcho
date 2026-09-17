import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import type { PhotoSyncPayloadItem, RemotePhoto } from '@/api/photo';

import { photoApi } from '@/api/photo';
import { projectApi } from '@/api/project';
import { subscriptionApi } from '@/api/subscription';
import { usePhotoMutations } from '@/composables/query/usePhoto';
import { useSubscription } from '@/composables/query/useSubscription';
import { useCurrentProject } from '@/composables/useCurrentProject';
import { useNetworkStatus } from '@/composables/useNetworkStatus';
import { useAuthStore } from '@/stores/useAuthStore';
import {
  type LocalPhoto,
  PhotoSyncLevel,
  type Project,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';
import { compressImage } from '@/utils/imageCompression';
import {
  deleteProjectFromIndexedDB,
  getAllPhotosFromIndexedDB,
  getProjectsFromIndexedDB,
  getRawPhotosFromIndexedDB,
  savePhotoToIndexedDB,
  saveProjectToIndexedDB,
  updatePhotoInIndexedDB,
  updateProjectInIndexedDB,
} from '@/utils/indexedDB';

const BATCH_SIZE = 5;

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URI prefix to send only the raw base64 payload
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.substring(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
};

const toSyncPayload = async (photo: LocalPhoto): Promise<PhotoSyncPayloadItem> => {
  // Layered Sync Architecture:
  // Layer 3 (Evidence): High quality (1600px)
  // Layer 2 (Thumbnail): Low quality (400px)
  // Layer 1: Local only (Not handled here)

  let cloudBlob: Blob;
  if (photo.syncLevel === PhotoSyncLevel.EVIDENCE) {
    // High quality for evidence
    cloudBlob = await compressImage(photo.file, 1600, 0.85);
  } else {
    // Low quality for thumbnails (sampled)
    cloudBlob = await compressImage(photo.file, 400, 0.6);
  }

  const fileBase64 = await blobToBase64(cloudBlob);
  return {
    clientId: photo.id,
    projectId: photo.projectId || null,
    takenAt: photo.takenAt.toISOString(),
    constructions: photo.constructions,
    space: photo.space,
    status: photo.status,
    pendingType: photo.pendingType,
    note: photo.note,
    reportNote: photo.reportNote,
    parentPhotoId: photo.parentPhotoId,
    relatedPhotoIds: photo.relatedPhotoIds,
    fileBase64: fileBase64,
    mimeType: 'image/jpeg',
    syncLevel: photo.syncLevel,
    isEvidence: photo.isEvidence,
    isSampled: photo.isSampled,
    isReported: photo.isReported,
    shares: photo.shares as unknown as Record<string, unknown>[] | null,
  };
};

const remotePhotoToLocal = async (
  remote: RemotePhoto,
  projectIdToClientIdMap?: Map<string, string>
): Promise<LocalPhoto | null> => {
  const imageUrl = remote.url ?? remote.thumbnailUrl ?? null;
  let file: Blob = new Blob();

  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      if (response.ok) {
        file = await response.blob();
      }
    } catch (error) {
      console.error(`[useRegistrationFlow] Error downloading image for ${remote.clientId}:`, error);
    }
  }

  if (file.size === 0) {
    return null;
  }

  // Map projectId to clientId using the mapping if provided
  const projectId = remote.projectId
    ? (projectIdToClientIdMap?.get(remote.projectId) ?? remote.projectId)
    : '';

  return {
    id: remote.clientId,
    file,
    takenAt: new Date(remote.takenAt),
    projectId,
    constructions: remote.constructions ?? [],
    space: remote.space,
    status: remote.status as LocalPhoto['status'],
    pendingType: remote.pendingType as LocalPhoto['pendingType'],
    note: remote.note ?? '',
    reportNote: remote.reportNote ?? undefined,
    synced: true,
    syncStatus: SyncStatus.DONE,
    isDeleted: false,
    isDirty: false,
    updatedBy: remote.updatedBy === 'web' ? UpdateSource.WEB : UpdateSource.APP,
    syncLevel: remote.isEvidence ? PhotoSyncLevel.EVIDENCE : PhotoSyncLevel.THUMBNAIL,
    isEvidence: remote.isEvidence,
    isSampled: !remote.isEvidence,
    isReported: false,
    parentPhotoId: remote.parentPhotoId ?? undefined,
    relatedPhotoIds: remote.relatedPhotoIds ?? [],
    shares: [],
    createdAt: new Date(remote.createdAt),
    updatedAt: new Date(remote.updatedAt),
  };
};

const showRegisterPrompt = ref(false);
const showUpgradePrompt = ref(false);
const promptReason = ref<'photo_count' | 'export_report' | 'follow_up_photo'>('photo_count');
const photoCount = ref(0);
const syncablePhotoCount = ref(0);
const isSyncing = ref(false);
const syncProgress = ref({ total: 0, synced: 0, failed: 0 });
const lastSyncError = ref<string | null>(null);
const unsyncedPhotoCount = ref(0);
// Guard so full cloud hydration (fetching every project + every photo) only
// runs once per authenticated session, instead of on every syncPhotos() call
// (e.g. single-photo evidence toggles), which was previously causing every
// small edit to trigger an expensive full re-download of cloud data.
const hasHydratedCloudData = ref(false);

interface UseRegistrationFlowOptions {
  enableAutoSync?: boolean;
}

export const useRegistrationFlow = (options: UseRegistrationFlowOptions = {}) => {
  const authStore = useAuthStore();
  const currentProjectStore = useCurrentProject();
  const router = useRouter();
  const { syncPhotos: syncPhotosMutation } = usePhotoMutations();
  const {
    isSubscribed,
    limits,
    isLoading: isSubscriptionLoading,
    refetchSubscription,
  } = useSubscription();
  const { isWifi } = useNetworkStatus();

  const isAuthenticated = computed(() => authStore.isAuthenticated);
  // All authenticated users can sync, but storage limits apply during sync
  const canSyncPhotos = computed(() => isAuthenticated.value);

  const getRemainingFreeReports = () => {
    if (limits.value.reportExportMonthlyLimit === Infinity) {
      return Infinity;
    }
    return Math.max(0, limits.value.remainingReportExports ?? 0);
  };

  const getRemainingFreeFollowUps = () => {
    if (limits.value.followUpMonthlyLimit === Infinity) {
      return Infinity;
    }
    return Math.max(0, limits.value.remainingFollowUps ?? 0);
  };

  const refreshUsage = async () => {
    try {
      await subscriptionApi.getUserUsage();
      await refetchSubscription();
    } catch (error) {
      console.warn('[useRegistrationFlow] Failed to refresh usage:', error);
    }
  };

  const hydrateCloudData = async () => {
    if (!isAuthenticated.value) return;

    try {
      const localPhotos = await getRawPhotosFromIndexedDB();

      const projectResponse = await projectApi.getProjects();
      const remoteProjects = projectResponse.data || [];

      if (remoteProjects.length === 0) {
        return;
      }

      // Build mapping from server ID to clientId to ensure photo.projectId points to correct project.clientId
      const projectIdToClientIdMap = new Map<string, string>();
      for (const remoteProject of remoteProjects) {
        const projectId = remoteProject.clientId ?? remoteProject.id;
        const clientId = remoteProject.clientId ?? projectId;
        const localProject: Project = {
          id: projectId,
          clientId: clientId,
          name: remoteProject.name,
          userId: remoteProject.userId,
          ownerName: remoteProject.ownerName,
          ownerEmail: remoteProject.ownerEmail,
          isShared: remoteProject.isShared,
          createdAt: new Date(remoteProject.createdAt),
          lastUsedAt: new Date(
            remoteProject.lastUsedAt ?? remoteProject.updatedAt ?? remoteProject.createdAt
          ),
          updatedAt: new Date(remoteProject.updatedAt),
          synced: true,
          syncStatus: SyncStatus.DONE,
          isDeleted: false,
          groupReportNotes: remoteProject.groupReportNotes
            ? Object.fromEntries(
                Object.entries(remoteProject.groupReportNotes).map(([key, value]) => [
                  key,
                  String(value),
                ])
              )
            : undefined,
        };

        await saveProjectToIndexedDB(localProject);

        // Map both server ID and clientId to the local clientId
        if (remoteProject.id) {
          projectIdToClientIdMap.set(remoteProject.id, clientId);
        }
        if (remoteProject.clientId) {
          projectIdToClientIdMap.set(remoteProject.clientId, clientId);
        }
      }

      await currentProjectStore.initializeCurrentProject();

      const projectIds = remoteProjects
        .map((project) => project.clientId ?? project.id)
        .filter((projectId): projectId is string => Boolean(projectId));

      const localPhotoMap = new Map(localPhotos.map((photo) => [photo.id, photo]));

      for (const projectId of projectIds) {
        try {
          const photoResponse = await photoApi.getByProjectId(projectId, true);
          const remotePhotos = photoResponse.data || [];

          for (const remotePhoto of remotePhotos) {
            const localPhotoId = remotePhoto.clientId ?? remotePhoto.id;
            if (remotePhoto.deletedAt || localPhotoMap.has(localPhotoId)) {
              continue;
            }

            const localPhoto = await remotePhotoToLocal(remotePhoto, projectIdToClientIdMap);
            if (localPhoto) {
              await savePhotoToIndexedDB(localPhoto);
              localPhotoMap.set(localPhoto.id, localPhoto);
            }
          }
        } catch (error) {
          console.error(
            `[useRegistrationFlow] Failed to hydrate photos for project ${projectId}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('[useRegistrationFlow] Failed to hydrate cloud data:', error);
    }
  };

  const checkPhotoCountTrigger = async () => {
    if (canSyncPhotos.value) {
      // If already logged in and paid, we check if we should auto-sync
      if (isWifi.value) {
        syncPhotos();
      }
      return;
    }

    const photos = await getAllPhotosFromIndexedDB();
    photoCount.value = photos.length;

    if (photoCount.value >= 10) {
      promptReason.value = 'photo_count';
      showRegisterPrompt.value = true;
    }
  };

  const checkExportReportTrigger = () => {
    if (!isAuthenticated.value) {
      promptReason.value = 'export_report';
      showRegisterPrompt.value = true;
      return false;
    }

    // If user is subscribed (paid), allow unlimited reports (even if still loading)
    if (isSubscribed.value) {
      return true;
    }

    // Wait for subscription data to load before making a decision for non-paid users
    if (isSubscriptionLoading.value) {
      return false;
    }

    // Check free report credits from the subscription API
    const remainingFreeReports = getRemainingFreeReports();
    if (remainingFreeReports > 0) {
      return true;
    }

    // No free credits left, show upgrade prompt
    showUpgradePrompt.value = true;
    return false;
  };

  const consumeReportExport = async () => {
    try {
      const result = await subscriptionApi.consumeUsage('report_export');
      if (result.success && result.data) {
        await refetchSubscription();
        return result.data.allowed;
      }
      return false;
    } catch (error) {
      console.error('[useRegistrationFlow] Failed to consume report export:', error);
      return false;
    }
  };

  const consumeFollowUpPhoto = async () => {
    try {
      const result = await subscriptionApi.consumeUsage('follow_up_photo');
      if (result.success && result.data) {
        await refetchSubscription();
        return result.data.allowed;
      }
      return false;
    } catch (error) {
      console.error('[useRegistrationFlow] Failed to consume follow-up photo:', error);
      return false;
    }
  };

  const checkFollowUpTrigger = () => {
    if (!isAuthenticated.value) {
      promptReason.value = 'follow_up_photo';
      showRegisterPrompt.value = true;
      return false;
    }

    // If user is subscribed (paid), allow unlimited follow-up photos (even if still loading)
    if (isSubscribed.value) {
      return true;
    }

    // Wait for subscription data to load before making a decision for non-paid users
    if (isSubscriptionLoading.value) {
      return false;
    }

    // Check free follow-up credits from the subscription API
    const remainingFreeFollowUps = getRemainingFreeFollowUps();
    if (remainingFreeFollowUps > 0) {
      return true;
    }

    // No free credits left, show upgrade prompt
    showUpgradePrompt.value = true;
    return false;
  };

  const updatePhotoCount = async () => {
    const photos = await getAllPhotosFromIndexedDB();
    photoCount.value = photos.length;

    // Count syncable photos (layer 2-3 only, excluding layer 1 which is local only)
    const syncable = photos.filter((p) => !p.isDeleted && p.syncLevel !== PhotoSyncLevel.NONE);
    syncablePhotoCount.value = syncable.length;

    // Count unsynced photos that should be synced (not deleted, has sync level)
    const unsynced = photos.filter(
      (p) => !p.synced && !p.isDeleted && p.syncLevel !== PhotoSyncLevel.NONE
    );
    unsyncedPhotoCount.value = unsynced.length;
  };

  const syncProjects = async () => {
    if (!isAuthenticated.value) return;

    try {
      const projects = await getProjectsFromIndexedDB();

      // 1. Handle deletes
      const deletedProjects = projects.filter((p) => p.isDeleted && p.synced);
      if (deletedProjects.length > 0) {
        const clientIds = deletedProjects.map((p) => p.id);
        try {
          await projectApi.deleteBatch(clientIds);
          // Hard delete from IndexedDB after successful sync
          for (const id of clientIds) {
            await deleteProjectFromIndexedDB(id);
          }
        } catch (e) {
          console.error('Project batch delete sync failed:', e);
        }
      }

      // 1b. Clean up projects that were deleted locally but never reached the server
      // (synced=false/undefined means they were never uploaded, so no server-side deletion needed)
      const localOnlyDeleted = projects.filter((p) => p.isDeleted && !p.synced);
      for (const p of localOnlyDeleted) {
        try {
          await deleteProjectFromIndexedDB(p.id);
        } catch (e) {
          console.error(`Failed to clean up local-only deleted project ${p.id}:`, e);
        }
      }

      // 2. Handle upserts (new or updated)
      // Only sync owned projects to server (do not sync shared/collaborator projects).
      // This ensures projects marked synced=true locally but missing from server
      // (e.g. different account, server-side deletion) are re-created before photos upload.
      const projectsToSync = projects.filter((p) => !p.isDeleted && !p.isShared);

      if (projectsToSync.length === 0) return;

      const payload = projectsToSync.map((p) => ({
        clientId: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
        lastUsedAt: p.lastUsedAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      }));

      const response = await projectApi.sync(payload);
      const results = response.data?.results || [];

      for (const result of results) {
        if (result.success) {
          await updateProjectInIndexedDB(result.client_id, {
            synced: true,
            syncStatus: SyncStatus.DONE,
          });
        } else {
          console.error(`Failed to sync project ${result.client_id}:`, result.error);
          // Mark as pending so it can be retried
          await updateProjectInIndexedDB(result.client_id, {
            synced: false,
            syncStatus: SyncStatus.PENDING,
          });
        }
      }
    } catch (error) {
      console.error('Project sync failed:', error);
    }
  };

  const syncPhotos = async (bypassWifiCheck = false) => {
    if (!isAuthenticated.value) return;
    if (isSyncing.value) {
      return;
    }

    // WiFi check for auto-sync (can be bypassed for manual sync after login)
    if (!bypassWifiCheck && !isWifi.value) {
      return;
    }

    isSyncing.value = true;
    lastSyncError.value = null;
    syncProgress.value = { total: 0, synced: 0, failed: 0 };

    try {
      // 1. Sync projects first (allowed for all authenticated users)
      await syncProjects();

      // 1b. Hydrate cloud projects and photos so a fresh device can render data immediately.
      // Only run once per session - this is a full cloud walk (all projects + all photos)
      // and must not run on every syncPhotos() call (e.g. single-photo evidence toggles).
      if (!hasHydratedCloudData.value) {
        await hydrateCloudData();
        hasHydratedCloudData.value = true;
      }

      // 2. Sync photos (allowed for all authenticated users)

      // Use raw photos to include soft-deleted ones that need to be synced for deletion
      const photos = await getRawPhotosFromIndexedDB();

      // Note: Photo deletion sync is now handled by usePhotoSync in timeline page
      // Removed photo deletion logic here to avoid conflicts

      // 2b. Handle photo upserts
      const unsyncedPhotos = photos.filter(
        (p) => !p.synced && !p.isDeleted && p.syncLevel !== PhotoSyncLevel.NONE
      );

      // Get all projects to check which project_ids exist and are synced to database
      const allProjects = await getProjectsFromIndexedDB();
      // Only include projects that have been synced to database
      const syncedProjectIds = new Set(allProjects.filter((p) => p.synced).map((p) => p.id));

      // Filter out photos whose project doesn't exist or hasn't been synced to database
      const validPhotos = unsyncedPhotos.filter((p) => {
        if (!p.projectId || !syncedProjectIds.has(p.projectId)) {
          return false;
        }
        return true;
      });

      // Check storage capacity before syncing. Shared-project photos are checked by
      // the backend against the project owner's quota, not the collaborator's quota.
      const hasSharedProjectPhoto = validPhotos.some((photo) =>
        allProjects.some((project) => project.id === photo.projectId && project.isShared)
      );
      const storageLimitBytes = limits.value.storageLimitBytes;
      const usedStorageBytes = limits.value.usedStorageBytes;
      const remainingStorageBytes = storageLimitBytes - usedStorageBytes;

      // Estimate photo sizes (rough estimate: average 5MB per photo for layer 3, 1MB for layer 2)
      const estimatedPhotoSizeBytes = validPhotos.length * 5 * 1024 * 1024;

      if (!hasSharedProjectPhoto && estimatedPhotoSizeBytes > remainingStorageBytes) {
        console.warn('[syncPhotos] storage capacity exceeded, skipping photo sync', {
          estimated: estimatedPhotoSizeBytes,
          remaining: remainingStorageBytes,
        });
        lastSyncError.value = 'Storage capacity exceeded. Please upgrade to Pro for more storage.';
        // Don't return here - projects already synced, just skip photos
        return;
      }

      if (validPhotos.length === 0) return;

      syncProgress.value.total = validPhotos.length;

      // Upload in batches to avoid huge payloads
      for (let i = 0; i < validPhotos.length; i += BATCH_SIZE) {
        const batch = validPhotos.slice(i, i + BATCH_SIZE);
        const payload = await Promise.all(batch.map(toSyncPayload));

        try {
          const response = await syncPhotosMutation(payload);
          const results = response?.results || [];

          for (const result of results) {
            if (result.success) {
              // Handle both snake_case (backend) and camelCase (frontend) response formats
              const clientId =
                'client_id' in result
                  ? (result as { client_id: string }).client_id
                  : result.clientId;
              if (clientId) {
                await updatePhotoInIndexedDB(clientId, {
                  synced: true,
                  syncStatus: SyncStatus.DONE,
                });
                syncProgress.value.synced += 1;
              }
            } else {
              syncProgress.value.failed += 1;
              if (!lastSyncError.value && result.error) {
                lastSyncError.value = result.error;
              }
            }
          }
        } catch (batchError) {
          syncProgress.value.failed += batch.length;
          const message = batchError instanceof Error ? batchError.message : 'Batch sync failed';
          lastSyncError.value = message;
          console.error('[syncPhotos] batch FAILED:', batchError);
        }
      }
    } catch (error) {
      console.error('[syncPhotos] outer catch - Sync failed:', error);
      lastSyncError.value = error instanceof Error ? error.message : 'Sync failed';
    } finally {
      isSyncing.value = false;
      // Update unsynced count after sync completes
      await updatePhotoCount();
    }
  };

  const redirectToLogin = (context?: {
    route?: string;
    selectedPhotoIds?: string[];
    reportData?: {
      purpose: string | null;
      billing: Record<string, number> | null;
    };
  }) => {
    showRegisterPrompt.value = false;

    // Save context for post-login restoration
    if (context) {
      sessionStorage.setItem('login_redirect_context', JSON.stringify(context));
    }

    router.push({ name: 'login' });
  };

  const getLoginRedirectContext = () => {
    const contextStr = sessionStorage.getItem('login_redirect_context');
    if (!contextStr) return null;
    try {
      return JSON.parse(contextStr);
    } catch {
      return null;
    }
  };

  const clearLoginRedirectContext = () => {
    sessionStorage.removeItem('login_redirect_context');
  };

  // Auto-sync when (auth and subscription status) changes OR when WiFi becomes available
  if (options.enableAutoSync) {
    watch(
      [canSyncPhotos, isWifi],
      ([canSync, hasWifi]) => {
        if (canSync && hasWifi) {
          syncPhotos();
        }
      },
      { immediate: true }
    );
  }

  // Reset the one-time hydration guard on logout so the next login re-hydrates cloud data
  watch(isAuthenticated, (authenticated) => {
    if (!authenticated) {
      hasHydratedCloudData.value = false;
    }
  });

  return {
    showRegisterPrompt,
    showUpgradePrompt,
    promptReason,
    photoCount,
    syncablePhotoCount,
    isSyncing,
    syncProgress,
    lastSyncError,
    unsyncedPhotoCount,
    isAuthenticated,
    isSubscribed,
    limits,
    canSyncPhotos,
    isWifi,
    checkPhotoCountTrigger,
    checkExportReportTrigger,
    checkFollowUpTrigger,
    redirectToLogin,
    getLoginRedirectContext,
    clearLoginRedirectContext,
    syncPhotos,
    getRemainingFreeFollowUps,
    getFreeFollowUpCount: () => limits.value.usedFollowUps ?? 0,
    updatePhotoCount,
    getFreeReportCount: () => limits.value.usedReportExports ?? 0,
    getRemainingFreeReports,
    refreshUsage,
    consumeReportExport,
    consumeFollowUpPhoto,
  };
};
