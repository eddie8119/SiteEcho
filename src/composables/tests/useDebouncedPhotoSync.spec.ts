import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useDebouncedPhotoSync } from '@/composables/useDebouncedPhotoSync';
import {
  type LocalPhoto,
  PendingType,
  PhotoStatus,
  PhotoSyncLevel,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';

const { getAllPhotosFromIndexedDBMock, updateBatchMock, syncMock, updatePhotoInIndexedDBMock } =
  vi.hoisted(() => ({
    getAllPhotosFromIndexedDBMock: vi.fn(),
    updateBatchMock: vi.fn(),
    syncMock: vi.fn(),
    updatePhotoInIndexedDBMock: vi.fn(),
  }));

vi.mock('@/api/photo', () => ({
  photoApi: {
    updateBatch: (...args: unknown[]) => updateBatchMock(...args),
    sync: (...args: unknown[]) => syncMock(...args),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));

vi.mock('@/utils/indexedDB', () => ({
  getAllPhotosFromIndexedDB: (...args: unknown[]) => getAllPhotosFromIndexedDBMock(...args),
  updatePhotoInIndexedDB: (...args: unknown[]) => updatePhotoInIndexedDBMock(...args),
}));

const makeLocalPhoto = (): LocalPhoto => ({
  id: 'photo-1',
  file: new Blob(['local'], { type: 'image/jpeg' }),
  takenAt: new Date('2026-07-09T00:00:00.000Z'),
  projectId: 'project-1',
  constructions: ['A'],
  space: '1F',
  status: PhotoStatus.PENDING,
  pendingType: PendingType.ISSUE,
  note: 'dirty note',
  createdAt: new Date('2026-07-09T00:00:00.000Z'),
  updatedAt: new Date('2026-07-09T00:05:00.000Z'),
  resolvedAt: undefined,
  synced: true,
  syncStatus: SyncStatus.PENDING,
  isDeleted: false,
  updatedBy: UpdateSource.APP,
  syncLevel: PhotoSyncLevel.EVIDENCE,
  isEvidence: true,
  trashedAt: undefined,
  isSampled: false,
  isReported: false,
  reportNote: undefined,
  parentPhotoId: undefined,
  relatedPhotoIds: [],
  shares: [],
  isDirty: true,
});

describe('useDebouncedPhotoSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();

    getAllPhotosFromIndexedDBMock.mockResolvedValue([]);
    updateBatchMock.mockResolvedValue({
      success: true,
      data: { total: 1, synced: 1, failed: 0, results: [{ clientId: 'photo-1', success: true }] },
    });
    syncMock.mockResolvedValue({
      success: true,
      data: { total: 1, synced: 1, failed: 0, results: [{ clientId: 'photo-1', success: true }] },
    });
    updatePhotoInIndexedDBMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('syncs dirty evidence photos even when synced is false and marks them synced after success', async () => {
    getAllPhotosFromIndexedDBMock.mockResolvedValue([makeLocalPhoto()]);

    const { triggerSync } = useDebouncedPhotoSync();
    await triggerSync('photo-1', PhotoSyncLevel.EVIDENCE, true);

    await vi.advanceTimersByTimeAsync(10_000);

    expect(updateBatchMock).toHaveBeenCalledWith([
      expect.objectContaining({
        clientId: 'photo-1',
        syncLevel: PhotoSyncLevel.EVIDENCE,
        isEvidence: true,
        note: 'dirty note',
        space: '1F',
        status: PhotoStatus.PENDING,
      }),
    ]);

    expect(updatePhotoInIndexedDBMock).toHaveBeenCalledWith(
      'photo-1',
      expect.objectContaining({
        isDirty: false,
        synced: true,
        syncStatus: SyncStatus.DONE,
      })
    );
  });
});
