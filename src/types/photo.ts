export enum PhotoStatus {
  NORMAL = 'normal',
  PENDING = 'pending',
  RESOLVED = 'resolved',
}

export enum PendingType {
  ISSUE = 'issue',
  FIX = 'fix',
  CHECK = 'check',
}

export enum CompletionStatus {
  COMPLETED = 'completed',
  PENDING = 'pending',
}

export enum SyncStatus {
  PENDING = 'pending',
  SYNCING = 'syncing',
  DONE = 'done',
  ERROR = 'error',
}

export interface Project {
  id: string;
  clientId?: string;
  name: string;
  userId?: string;
  ownerName?: string;
  ownerEmail?: string;
  isShared?: boolean;
  createdAt: Date;
  lastUsedAt: Date;
  updatedAt: Date;
  synced?: boolean;
  syncStatus?: SyncStatus;
  isDeleted?: boolean;
  groupReportNotes?: Record<string, string>; // key: "space-construction"
}

export enum PhotoShareRole {
  OWNER = 'owner',
  WORKER = 'worker',
  COLLEAGUE = 'colleague',
}

// 分享對象型別 (用於最近使用)
export interface ShareTarget {
  role: PhotoShareRole;
  trade?: string;
  displayName: string;
}

// 分享紀錄型別
export interface PhotoShare {
  id: string;
  role: PhotoShareRole;
  trade?: string;
  displayName: string;
  createdAt: Date;
}

export enum PhotoSyncLevel {
  NONE = 'none', // Layer 1: Local only
  THUMBNAIL = 'thumbnail', // Layer 2: Cloud thumbnail
  EVIDENCE = 'evidence', // Layer 3: Cloud high-quality
}

export enum UpdateSource {
  APP = 'app',
  WEB = 'web',
}

// Base interface for common photo fields
interface PhotoBase {
  id: string;
  projectId: string;
  constructions: string[];
  space: string | null;
  status: PhotoStatus;
  pendingType: PendingType | null;
  note: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date; // 問題解決時間
  // 同步相關
  synced: boolean;
  syncStatus: SyncStatus;
  isDeleted: boolean;
  updatedBy: UpdateSource;
  userId?: string;
  uploadedBy?: string;
  // 分層架構相關
  syncLevel: PhotoSyncLevel;
  isEvidence: boolean; // 是否為保留照片
  trashedAt?: Date; // 垃圾桶時間戳：設定 = 可復原刪除（保留雲端），未設定 = 永久刪除
  isSampled: boolean; // 是否被系統抽樣
  isReported: boolean; // 是否曾被用於產生報告
  reportNote?: string; // 對外描述（選填）
  parentPhotoId?: string; // 若為處理後照片，對應的原始照片 ID
  relatedPhotoIds?: string[]; // 原始照片關聯的處理後照片 IDs
  // 分享紀錄
  shares: PhotoShare[];
}

// Local photo interface (for IndexedDB)
export interface LocalPhoto extends PhotoBase {
  file: Blob;
  takenAt: Date;
  isDirty: boolean; // has unsynced local edits after upload
}

export interface LocalPhotoRecord extends PhotoBase {
  fileName: string;
  takenAt: number;
  reportNote?: string;
  isDirty: boolean; // has unsynced local edits after upload
}

export interface PhotoRecord extends PhotoBase {
  imageUrl: string;
  thumbnailUrl?: string; // 雲端縮圖
  takenAt: Date;
  userId: string;
  deletedAt?: Date | null; // 軟刪除時間戳（Web 專用）
  clientId?: string; // Client ID for sync with mobile (same as id for consistency)
  serverId?: string; // Server UUID for operations that need it
}

export interface GroupedPhotos {
  date: string;
  dateLabel: string;
  photos: PhotoRecord[];
}

export interface ProjectGroup {
  projectId: string;
  projectName: string;
  photos: PhotoRecord[];
}

export interface GroupedPhotosByProject {
  date: string;
  dateLabel: string;
  projectGroups: ProjectGroup[];
}

export interface OptionItem {
  id: string;
  name: string;
}

export interface ConstructionOption extends OptionItem {
  type: 'construction';
}

export interface SpaceOption extends OptionItem {
  type: 'space';
}
