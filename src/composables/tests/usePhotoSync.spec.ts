import { beforeEach, describe, expect, it, vi } from 'vitest';

import { usePhotoSync } from '@/composables/usePhotoSync';
import {
  type LocalPhoto,
  PendingType,
  PhotoStatus,
  PhotoSyncLevel,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';

const {
  deletePhotoByClientIdMock,
  deletePhotoFromIndexedDBMock,
  deleteBatchMock,
  getByProjectIdMock,
  getDBMock,
  getRawPhotosFromIndexedDBMock,
  savePhotoToIndexedDBMock,
  syncMock,
  updateBatchMock,
  updatePhotoInIndexedDBMock,
} = vi.hoisted(() => ({
  deletePhotoByClientIdMock: vi.fn(),
  deletePhotoFromIndexedDBMock: vi.fn(),
  deleteBatchMock: vi.fn(),
  getByProjectIdMock: vi.fn(),
  getDBMock: vi.fn(),
  getRawPhotosFromIndexedDBMock: vi.fn(),
  savePhotoToIndexedDBMock: vi.fn(),
  syncMock: vi.fn(),
  updateBatchMock: vi.fn(),
  updatePhotoInIndexedDBMock: vi.fn(),
}));

vi.mock('@/api/photo', () => ({
  deletePhotoByClientId: (...args: unknown[]) => deletePhotoByClientIdMock(...args),
  photoApi: {
    getByProjectId: (...args: unknown[]) => getByProjectIdMock(...args),
    sync: (...args: unknown[]) => syncMock(...args),
    updateBatch: (...args: unknown[]) => updateBatchMock(...args),
    deleteBatch: (...args: unknown[]) => deleteBatchMock(...args),
  },
}));

vi.mock('@/stores/useAuthStore', () => ({
  useAuthStore: () => ({ isAuthenticated: true }),
}));

vi.mock('@/utils/indexedDB', () => ({
  deletePhotoFromIndexedDB: (...args: unknown[]) => deletePhotoFromIndexedDBMock(...args),
  getAllPhotosFromIndexedDB: vi.fn(),
  getDB: (...args: unknown[]) => getDBMock(...args),
  getRawPhotosFromIndexedDB: (...args: unknown[]) => getRawPhotosFromIndexedDBMock(...args),
  savePhotoToIndexedDB: (...args: unknown[]) => savePhotoToIndexedDBMock(...args),
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
  note: 'old note',
  createdAt: new Date('2026-07-09T00:00:00.000Z'),
  updatedAt: new Date('2026-07-09T00:05:00.000Z'),
  resolvedAt: undefined,
  synced: true,
  syncStatus: SyncStatus.DONE,
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
  isDirty: false,
});

const makeRemotePhoto = () => ({
  id: 'server-photo-1',
  clientId: 'photo-1',
  userId: 'user-1',
  projectId: 'project-1',
  filePath: 'photos/photo-1.jpg',
  fileSize: 1234,
  mimeType: 'image/jpeg',
  takenAt: '2026-07-09T00:00:00.000Z',
  constructions: ['A'],
  space: '1F',
  status: 'resolved',
  pendingType: PendingType.ISSUE,
  note: 'updated note',
  reportNote: null,
  parentPhotoId: null,
  relatedPhotoIds: [],
  resolvedAt: '2026-07-09T01:00:00.000Z',
  createdAt: '2026-07-09T00:00:00.000Z',
  updatedAt: '2026-07-09T01:00:00.000Z',
  url: null,
  thumbnailUrl: null,
  syncLevel: PhotoSyncLevel.EVIDENCE,
  isEvidence: true,
  updatedBy: 'web' as const,
  deletedAt: null,
});

describe('usePhotoSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getRawPhotosFromIndexedDBMock.mockResolvedValue([]);
    getByProjectIdMock.mockResolvedValue({ success: true, data: [] });
    syncMock.mockResolvedValue({
      success: true,
      data: { total: 0, synced: 0, failed: 0, results: [] },
    });
    updateBatchMock.mockResolvedValue({
      success: true,
      data: { total: 0, synced: 0, failed: 0, results: [] },
    });
    deleteBatchMock.mockResolvedValue({ success: true });
    deletePhotoByClientIdMock.mockResolvedValue(true);
    deletePhotoFromIndexedDBMock.mockResolvedValue(undefined);
    getDBMock.mockResolvedValue(undefined);
    savePhotoToIndexedDBMock.mockResolvedValue(undefined);
    updatePhotoInIndexedDBMock.mockResolvedValue(undefined);
  });

  it('syncProject promotes newer remote resolved status and resolvedAt over stale local pending data', async () => {
    const localPhoto = makeLocalPhoto();
    const remotePhoto = makeRemotePhoto();

    getRawPhotosFromIndexedDBMock.mockResolvedValue([localPhoto]);
    getByProjectIdMock.mockResolvedValue({ success: true, data: [remotePhoto] });

    const { syncProject } = usePhotoSync();
    const result = await syncProject('project-1');

    expect(getByProjectIdMock).toHaveBeenCalledWith('project-1', true);
    expect(result).toEqual({ merged: 1, added: 0, deleted: 0, skipped: 0 });
    expect(updatePhotoInIndexedDBMock).toHaveBeenCalledWith(
      'photo-1',
      expect.objectContaining({
        status: PhotoStatus.RESOLVED,
        resolvedAt: new Date('2026-07-09T01:00:00.000Z'),
        updatedAt: new Date('2026-07-09T01:00:00.000Z'),
        isEvidence: true,
        synced: true,
        syncStatus: SyncStatus.DONE,
        isDirty: false,
      })
    );
  });
});
