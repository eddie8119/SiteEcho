/**
 * 用於獲取與管理草稿資料。
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query';
import { type Ref } from 'vue';

import type { DraftResponse } from '@/types/response';

import { draftApi } from '@/api/draft';

interface UseDraftReturn {
  isLoadingDraft: Ref<boolean>;
  error: Ref<Error | null>;
  fetchedDraft: Ref<DraftResponse | null>;
  createDraft: (data: Partial<DraftResponse>) => Promise<DraftResponse | undefined>;
  updateDraft: (id: string, data: Partial<DraftResponse>) => Promise<DraftResponse | undefined>;
  deleteDraft: (id: string) => Promise<void>;
}

const QUERY_KEY = 'draft';

export function useDraft(): UseDraftReturn {
  const queryClient = useQueryClient();

  // 獲取草稿資料
  const {
    data: fetchedDraft,
    isLoading: isLoadingDraft,
    error,
  } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const response = await draftApi.getDraft();
      return response.data;
    },
    // 在 5 分鐘內視為新鮮資料：同一段時間內重新掛載組件會直接使用快取
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  // 建立草稿
  const { mutateAsync: createMutate } = useMutation({
    mutationFn: (data: Partial<DraftResponse>) => draftApi.createdraft(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const createDraft = async (data: Partial<DraftResponse>) => {
    try {
      const response = await createMutate(data);
      const created = response.data as DraftResponse | undefined;

      if (created) {
        // 直接更新當前快取，確保下次掛載時立刻看到最新草稿
        queryClient.setQueryData([QUERY_KEY], created);
      }

      return created;
    } catch (err) {
      console.error('建立草稿失敗:', err);
    }
  };

  // 更新草稿
  const { mutateAsync: updateMutate } = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<DraftResponse> }) =>
      draftApi.updatedraft(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const updateDraft = async (id: string, data: Partial<DraftResponse>) => {
    try {
      const response = await updateMutate({ id, data });
      const updated = response.data as DraftResponse | undefined;

      if (updated) {
        // 直接更新快取，避免重新開啟組件時先看到舊資料
        queryClient.setQueryData([QUERY_KEY], updated);
      }

      return updated;
    } catch (err) {
      console.error('更新草稿失敗:', err);
    }
  };

  // 刪除草稿
  const { mutateAsync: deleteMutate } = useMutation({
    mutationFn: (id: string) => draftApi.deletedraft(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });

  const deleteDraft = async (id: string) => {
    try {
      await deleteMutate(id);
    } catch (err) {
      console.error('刪除草稿失敗:', err);
    }
  };

  return {
    isLoadingDraft,
    error: error as Ref<Error | null>,
    fetchedDraft: fetchedDraft as Ref<DraftResponse | null>,
    createDraft,
    updateDraft,
    deleteDraft,
  };
}
