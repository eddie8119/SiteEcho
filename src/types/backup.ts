import type {
  PendingType,
  PhotoShare,
  PhotoStatus,
  PhotoSyncLevel,
  Project,
  SyncStatus,
  UpdateSource,
} from '@/types/photo';

export interface BackupPhotoMeta {
  id: string;
  projectId: string;
  takenAt: string | number | Date;
  constructions: string[];
  space: string | null;
  status: PhotoStatus;
  pendingType: PendingType | null;
  note: string;
  synced: boolean;
  syncStatus: SyncStatus;
  syncLevel: PhotoSyncLevel;
  isEvidence: boolean;
  isSampled: boolean;
  isReported: boolean;
  isDeleted: boolean;
  isDirty: boolean;
  updatedBy: UpdateSource;
  trashedAt?: string | number | Date | null;
  reportNote?: string;
  createdAt: string | number | Date;
  updatedAt: string | number | Date;
  fileName: string;
  shares: PhotoShare[];
  parentPhotoId?: string;
  relatedPhotoIds?: string[];
}

export interface BackupData {
  version: number;
  exportedAt: string;
  projects: Array<
    Project & {
      createdAt: string | number;
      lastUsedAt: string | number;
      updatedAt: string | number;
    }
  >;
  photos: BackupPhotoMeta[];
}
