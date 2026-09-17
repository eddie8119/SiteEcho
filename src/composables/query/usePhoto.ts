/**
 * 用於管理照片相關操作
 * 包含獲取、同步、刪除等功能
 *
 * @returns {Object}
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { computed, type MaybeRefOrGetter, type Ref, toValue } from 'vue';

import type {
  PhotoSyncPayloadItem,
  PhotoSyncResponse,
  PhotoUpdatePayload,
  RemotePhoto,
} from '@/api/photo';

import { deletePhoto, photoApi } from '@/api/photo';

interface UsePhotosReturn {
  // 獲取所有照片
  photos: Ref<RemotePhoto[] | undefined>;
  isLoadingPhotos: Ref<boolean>;
  photosError: Ref<Error | null>;
  refetchPhotos: () => Promise<void>;

  // 同步照片
  syncPhotos: (photos: PhotoSyncPayloadItem[]) => Promise<PhotoSyncResponse | null>;
  isSyncingPhotos: Ref<boolean>;
  syncPhotosError: Ref<Error | null>;

  // 批次刪除照片
  deletePhotos: (clientIds: string[]) => Promise<void>;
  isDeletingPhotos: Ref<boolean>;
  deletePhotosError: Ref<Error | null>;

  // Web 編輯照片（by server UUID）
  updatePhoto: (id: string, payload: PhotoUpdatePayload) => Promise<RemotePhoto | null>;
  isUpdatingPhoto: Ref<boolean>;
  updatePhotoError: Ref<Error | null>;

  // Web 刪除照片（by server UUID）
  deletePhotoById: (id: string) => Promise<void>;
  isDeletingPhotoById: Ref<boolean>;
  deletePhotoByIdError: Ref<Error | null>;
}

interface UsePhotosOptions {
  projectId?: MaybeRefOrGetter<string | undefined>;
}

const QUERY_KEY = 'photos';

export function usePhotos(options?: UsePhotosOptions): UsePhotosReturn {
  const queryClient = useQueryClient();

  const projectId = computed(() => toValue(options?.projectId));

  // ==================== 獲取所有照片 ====================
  const {
    data: photos,
    isLoading: isLoadingPhotos,
    refetch: refetchQueryPhotos,
    error: photosError,
  } = useQuery({
    queryKey: [QUERY_KEY, projectId],
    queryFn: async () => {
      const response = projectId.value
        ? await photoApi.getByProjectId(projectId.value)
        : await photoApi.getAll();
      return response.data;
    },
    staleTime: 1000 * 60 * 3,
  });

  const refetchPhotos = async (): Promise<void> => {
    await refetchQueryPhotos();
  };

  // ==================== 同步照片 ====================
  const {
    mutateAsync: mutateSync,
    isPending: isSyncingPhotos,
    error: syncPhotosError,
  } = useMutation({
    mutationFn: async (photos: PhotoSyncPayloadItem[]) => {
      const response = await photoApi.sync(photos);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const syncPhotos = async (photos: PhotoSyncPayloadItem[]): Promise<PhotoSyncResponse | null> => {
    try {
      const result = await mutateSync(photos);
      return result || null;
    } catch (err: unknown) {
      console.error('同步照片失敗:', err);
      return null;
    }
  };

  // ==================== 批次刪除照片 ====================
  const {
    mutateAsync: mutateDelete,
    isPending: isDeletingPhotos,
    error: deletePhotosError,
  } = useMutation({
    mutationFn: async (clientIds: string[]) => {
      await photoApi.deleteBatch(clientIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deletePhotos = async (clientIds: string[]): Promise<void> => {
    try {
      await mutateDelete(clientIds);
    } catch (err: unknown) {
      console.error('刪除照片失敗:', err);
    }
  };

  // ==================== Web 編輯照片 ====================
  const {
    mutateAsync: mutateUpdate,
    isPending: isUpdatingPhoto,
    error: updatePhotoError,
  } = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PhotoUpdatePayload }) => {
      const response = await photoApi.update(id, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updatePhoto = async (
    id: string,
    payload: PhotoUpdatePayload
  ): Promise<RemotePhoto | null> => {
    try {
      const result = await mutateUpdate({ id, payload });
      return result || null;
    } catch (err: unknown) {
      console.error('更新照片失敗:', err);
      return null;
    }
  };

  // ==================== Web 刪除照片（by server UUID）====================
  const {
    mutateAsync: mutateDeleteById,
    isPending: isDeletingPhotoById,
    error: deletePhotoByIdError,
  } = useMutation({
    mutationFn: async (id: string) => {
      await deletePhoto(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deletePhotoById = async (id: string): Promise<void> => {
    try {
      await mutateDeleteById(id);
    } catch (err: unknown) {
      console.error('刪除照片失敗:', err);
    }
  };

  return {
    // 獲取所有照片
    photos: photos as Ref<RemotePhoto[] | undefined>,
    isLoadingPhotos,
    photosError,
    refetchPhotos,
    // 同步照片
    syncPhotos,
    isSyncingPhotos,
    syncPhotosError,
    // 批次刪除照片
    deletePhotos,
    isDeletingPhotos,
    deletePhotosError,
    // Web 編輯照片
    updatePhoto,
    isUpdatingPhoto,
    updatePhotoError,
    // Web 刪除照片
    deletePhotoById,
    isDeletingPhotoById,
    deletePhotoByIdError,
  };
}

export function usePhotoMutations() {
  const queryClient = useQueryClient();

  // ==================== 同步照片 ====================
  const {
    mutateAsync: mutateSync,
    isPending: isSyncingPhotos,
    error: syncPhotosError,
  } = useMutation({
    mutationFn: async (photos: PhotoSyncPayloadItem[]) => {
      const response = await photoApi.sync(photos);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const syncPhotos = async (photos: PhotoSyncPayloadItem[]): Promise<PhotoSyncResponse | null> => {
    try {
      const result = await mutateSync(photos);
      return result || null;
    } catch (err: unknown) {
      console.error('同步照片失敗:', err);
      return null;
    }
  };

  // ==================== 批次刪除照片 ====================
  const {
    mutateAsync: mutateDelete,
    isPending: isDeletingPhotos,
    error: deletePhotosError,
  } = useMutation({
    mutationFn: async (clientIds: string[]) => {
      await photoApi.deleteBatch(clientIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deletePhotos = async (clientIds: string[]): Promise<void> => {
    try {
      await mutateDelete(clientIds);
    } catch (err: unknown) {
      console.error('刪除照片失敗:', err);
    }
  };

  return {
    syncPhotos,
    isSyncingPhotos,
    syncPhotosError,
    deletePhotos,
    isDeletingPhotos,
    deletePhotosError,
  };
}
