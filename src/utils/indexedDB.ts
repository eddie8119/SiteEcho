import type { LocalPhoto, LocalPhotoRecord, PhotoShare, Project } from '@/types/photo';

import { PhotoSyncLevel, SyncStatus, UpdateSource } from '@/types/photo';
import { logWarn } from '@/utils/logger';

const DB_NAME = 'KaiJiPhotoDB';
const DB_VERSION = 2;
const STORE_NAME = 'localPhotos';
const PROJECTS_STORE_NAME = 'projects';

let db: IDBDatabase | null = null;

/**
 * Check if a string is a valid UUID format
 */
const isValidUUID = (str: string): boolean => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

/**
 * Migrate non-UUID project IDs to UUID format
 */
export async function migrateProjectIds(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME, STORE_NAME], 'readwrite');
    const projectStore = transaction.objectStore(PROJECTS_STORE_NAME);
    const photoStore = transaction.objectStore(STORE_NAME);

    const request = projectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const projects = request.result as Project[];
      const migrations: Promise<void>[] = [];

      for (const project of projects) {
        if (!isValidUUID(project.id) && project.id.startsWith('project_')) {
          const newProjectId = crypto.randomUUID();

          // Update project ID
          const projectMigration = new Promise<void>((projResolve, projReject) => {
            const updatedProject = {
              ...project,
              id: newProjectId,
              synced: false,
              syncStatus: SyncStatus.PENDING,
            };
            const putRequest = projectStore.put(updatedProject);
            const deleteRequest = projectStore.delete(project.id);

            let completed = 0;
            const checkCompletion = () => {
              completed++;
              if (completed === 2) {
                projResolve();
              }
            };

            putRequest.onerror = () => projReject(putRequest.error);
            putRequest.onsuccess = checkCompletion;

            deleteRequest.onerror = () => projReject(deleteRequest.error);
            deleteRequest.onsuccess = checkCompletion;
          });

          migrations.push(projectMigration);

          // Update all photos that reference this project
          const photoMigration = new Promise<void>((photoResolve, photoReject) => {
            const getAllPhotosRequest = photoStore.getAll();

            getAllPhotosRequest.onerror = () => {
              photoReject(getAllPhotosRequest.error);
            };

            getAllPhotosRequest.onsuccess = () => {
              const allRecords = getAllPhotosRequest.result as Array<
                LocalPhotoRecord | Record<string, unknown>
              >;
              let completed = 0;
              let hasError = false;

              allRecords.forEach((record) => {
                if (hasError) return;
                const rec = record as Record<string, unknown>;
                if (typeof rec.id === 'string' && !rec.id.startsWith('blob_')) {
                  const photoRecord = rec as unknown as LocalPhotoRecord;
                  if (photoRecord.projectId === project.id) {
                    const updatedPhoto = {
                      ...photoRecord,
                      projectId: newProjectId,
                      synced: false,
                      syncStatus: SyncStatus.PENDING,
                    };
                    const putRequest = photoStore.put(updatedPhoto);

                    putRequest.onerror = () => {
                      if (!hasError) {
                        hasError = true;
                        photoReject(putRequest.error);
                      }
                    };

                    putRequest.onsuccess = () => {
                      completed++;
                      if (
                        completed ===
                        allRecords.filter((r) => {
                          const rRec = r as Record<string, unknown>;
                          return (
                            typeof rRec.id === 'string' &&
                            !rRec.id.startsWith('blob_') &&
                            (rRec as unknown as LocalPhotoRecord).projectId === project.id
                          );
                        }).length
                      ) {
                        photoResolve();
                      }
                    };
                  }
                }
              });

              // If no photos need updating, resolve immediately
              if (completed === 0) {
                photoResolve();
              }
            };
          });

          migrations.push(photoMigration);
        }
      }

      Promise.all(migrations)
        .then(() => {
          resolve();
        })
        .catch((error) => {
          reject(error);
        });
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Initialize IndexedDB database
 * Creates object store and indexes if they don't exist
 */
export async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      // Run migration after database is opened
      migrateProjectIds().catch((err) => {
        logWarn('Project ID migration failed:', err, 'IndexedDB');
      });
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        objectStore.createIndex('synced', 'synced', { unique: false });
        objectStore.createIndex('takenAt', 'takenAt', { unique: false });
      }

      if (!database.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        database.createObjectStore(PROJECTS_STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getDB(): Promise<IDBDatabase> {
  if (!db) {
    return initDB();
  }
  return db;
}

/**
 * Save a photo to IndexedDB
 * Stores both the photo metadata and the blob file separately
 */
export async function savePhotoToIndexedDB(photo: LocalPhoto): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const record: LocalPhotoRecord = {
      id: photo.id,
      fileName: `${photo.id}.jpg`,
      takenAt: photo.takenAt.getTime(),
      projectId: photo.projectId,
      constructions: photo.constructions ? [...photo.constructions] : [],
      space: photo.space,
      status: photo.status,
      pendingType: photo.pendingType,
      note: photo.note,
      synced: photo.synced,
      syncStatus: photo.syncStatus,
      isDeleted: photo.isDeleted || false,
      isDirty: photo.isDirty || false,
      updatedBy: photo.updatedBy || UpdateSource.APP,
      userId: photo.userId,
      uploadedBy: photo.uploadedBy,
      syncLevel: photo.syncLevel || 'none',
      isEvidence: photo.isEvidence || false,
      trashedAt: photo.trashedAt,
      isSampled: photo.isSampled || false,
      isReported: photo.isReported || false,
      reportNote: photo.reportNote,
      parentPhotoId: photo.parentPhotoId,
      relatedPhotoIds: photo.relatedPhotoIds ? [...photo.relatedPhotoIds] : [],
      shares: photo.shares || [],
      createdAt: photo.createdAt,
      updatedAt: photo.updatedAt,
    };

    // Store the photo record
    const recordRequest = objectStore.put(record);

    recordRequest.onerror = () => {
      reject(recordRequest.error);
    };

    recordRequest.onsuccess = () => {
      // Store blob with a separate key
      const blobKey = `blob_${photo.id}`;
      const blobRecord = {
        id: blobKey,
        blob: photo.file,
        photoId: photo.id,
      };

      const blobRequest = objectStore.put(blobRecord);
      blobRequest.onerror = () => {
        reject(blobRequest.error);
      };

      blobRequest.onsuccess = () => {
        resolve();
      };
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function getPhotoFromIndexedDB(photoId: string): Promise<LocalPhoto | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    const recordRequest = objectStore.get(photoId);
    recordRequest.onerror = () => {
      reject(recordRequest.error);
    };

    recordRequest.onsuccess = () => {
      const record = recordRequest.result as LocalPhotoRecord | undefined;

      if (!record) {
        resolve(null);
        return;
      }

      // Get the blob
      const blobKey = `blob_${photoId}`;
      const blobRequest = objectStore.get(blobKey);

      blobRequest.onerror = () => {
        reject(blobRequest.error);
      };

      blobRequest.onsuccess = () => {
        const blobRecord = blobRequest.result as Record<string, unknown>;

        if (!blobRecord) {
          resolve(null);
          return;
        }

        const photo: LocalPhoto = {
          id: record.id,
          file: blobRecord.blob as Blob,
          takenAt: new Date(record.takenAt),
          projectId: record.projectId || '',
          constructions: record.constructions,
          space: record.space,
          status: record.status,
          pendingType: record.pendingType,
          note: record.note,
          synced: record.synced,
          syncStatus: record.syncStatus,
          isDeleted: record.isDeleted,
          isDirty: record.isDirty || false,
          updatedBy: record.updatedBy || UpdateSource.APP,
          userId: record.userId,
          uploadedBy: record.uploadedBy,
          syncLevel: record.syncLevel || 'none',
          isEvidence: record.isEvidence || false,
          trashedAt: record.trashedAt,
          isSampled: record.isSampled || false,
          isReported: record.isReported || false,
          reportNote: record.reportNote,
          resolvedAt: record.resolvedAt ? new Date(record.resolvedAt) : undefined,
          parentPhotoId: record.parentPhotoId,
          relatedPhotoIds: record.relatedPhotoIds || [],
          shares: record.shares || [],
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        };

        resolve(photo);
      };
    };
  });
}

/**
 * Delete orphan photos (photos without projectId)
 */
export async function deleteOrphanPhotosFromIndexedDB(): Promise<number> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const allRecords = request.result as Array<LocalPhotoRecord | Record<string, unknown>>;
      const orphanIds: string[] = [];

      allRecords.forEach((record) => {
        const rec = record as Record<string, unknown>;
        // Find photo records without projectId or with empty projectId
        if (typeof rec.id === 'string' && !rec.id.startsWith('blob_')) {
          const photoRecord = rec as unknown as LocalPhotoRecord;
          if (!photoRecord.projectId || photoRecord.projectId === '') {
            orphanIds.push(photoRecord.id);
          }
        }
      });

      if (orphanIds.length === 0) {
        resolve(0);
        return;
      }

      // Delete both photo records and their blobs
      let deletedCount = 0;
      const deletePromises = orphanIds.map((id) => {
        return new Promise<void>((deleteResolve, deleteReject) => {
          const deletePhotoRequest = objectStore.delete(id);
          const deleteBlobRequest = objectStore.delete(`blob_${id}`);

          let completed = 0;
          const checkCompletion = () => {
            completed++;
            if (completed === 2) {
              deletedCount++;
              deleteResolve();
            }
          };

          deletePhotoRequest.onerror = () => deleteReject(deletePhotoRequest.error);
          deletePhotoRequest.onsuccess = checkCompletion;

          deleteBlobRequest.onerror = () => deleteReject(deleteBlobRequest.error);
          deleteBlobRequest.onsuccess = checkCompletion;
        });
      });

      Promise.all(deletePromises)
        .then(() => {
          resolve(deletedCount);
        })
        .catch((error) => {
          reject(error);
        });
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Get all photo records from IndexedDB (including soft-deleted ones)
 * Used for sync process to handle deletions
 */
export async function getRawPhotosFromIndexedDB(): Promise<LocalPhoto[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const allRecords = request.result as Array<LocalPhotoRecord | Record<string, unknown>>;
      const records: LocalPhotoRecord[] = [];
      const photos: LocalPhoto[] = [];

      allRecords.forEach((record) => {
        const rec = record as Record<string, unknown>;
        if (typeof rec.id === 'string' && !rec.id.startsWith('blob_')) {
          records.push(rec as unknown as LocalPhotoRecord);
        }
      });

      if (records.length === 0) {
        resolve(photos);
        return;
      }

      let completed = 0;
      records.forEach((record) => {
        const blobKey = `blob_${record.id}`;
        const blobRequest = objectStore.get(blobKey);

        blobRequest.onsuccess = () => {
          const blobRecord = blobRequest.result as Record<string, unknown>;
          if (blobRecord) {
            photos.push({
              id: record.id,
              file: blobRecord.blob as Blob,
              takenAt: new Date(record.takenAt),
              projectId: record.projectId || '',
              constructions: record.constructions,
              space: record.space,
              status: record.status,
              pendingType: record.pendingType,
              note: record.note,
              synced: record.synced,
              syncStatus: record.syncStatus,
              isDeleted: record.isDeleted || false,
              isDirty: record.isDirty || false,
              updatedBy: record.updatedBy || UpdateSource.APP,
              userId: record.userId,
              uploadedBy: record.uploadedBy,
              syncLevel: record.syncLevel || 'none',
              isEvidence: record.isEvidence || false,
              trashedAt: record.trashedAt,
              isSampled: record.isSampled || false,
              isReported: record.isReported || false,
              reportNote: record.reportNote,
              parentPhotoId: record.parentPhotoId,
              relatedPhotoIds: record.relatedPhotoIds || [],
              shares: record.shares || [],
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            });
          }
          completed++;
          if (completed === records.length) {
            resolve(photos);
          }
        };
      });
    };
  });
}

/**
 * Get all photos from IndexedDB (excluding soft-deleted ones)
 */
export async function getAllPhotosFromIndexedDB(): Promise<LocalPhoto[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    // Get all records from the object store
    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const allRecords = request.result as Array<LocalPhotoRecord | Record<string, unknown>>;
      const records: LocalPhotoRecord[] = [];
      const photos: LocalPhoto[] = [];

      // Filter out blob records and keep only photo records
      allRecords.forEach((record) => {
        const rec = record as Record<string, unknown>;
        if (typeof rec.id === 'string' && !rec.id.startsWith('blob_') && rec.isDeleted !== true) {
          records.push(rec as unknown as LocalPhotoRecord);
        }
      });

      let completed = 0;

      if (records.length === 0) {
        resolve(photos);
        return;
      }

      records.forEach((record) => {
        const blobKey = `blob_${record.id}`;
        const blobRequest = objectStore.get(blobKey);

        blobRequest.onsuccess = () => {
          const blobRecord = blobRequest.result as Record<string, unknown>;

          if (blobRecord) {
            photos.push({
              id: record.id,
              file: blobRecord.blob as Blob,
              takenAt: new Date(record.takenAt),
              projectId: record.projectId || '',
              constructions: record.constructions,
              space: record.space,
              status: record.status,
              pendingType: record.pendingType,
              note: record.note,
              synced: record.synced,
              syncStatus: record.syncStatus,
              isDeleted: record.isDeleted || false,
              isDirty: record.isDirty || false,
              updatedBy: record.updatedBy || UpdateSource.APP,
              userId: record.userId,
              uploadedBy: record.uploadedBy,
              syncLevel: record.syncLevel || 'none',
              isEvidence: record.isEvidence || false,
              trashedAt: record.trashedAt,
              isSampled: record.isSampled || false,
              isReported: record.isReported || false,
              reportNote: record.reportNote,
              parentPhotoId: record.parentPhotoId,
              relatedPhotoIds: record.relatedPhotoIds || [],
              shares: record.shares || [],
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            });
          } else {
            logWarn('[getAllPhotosFromIndexedDB] Blob missing for photo:', record.id, 'IndexedDB');
          }

          completed++;
          if (completed === records.length) {
            resolve(photos);
          }
        };
      });
    };
  });
}

export async function updatePhotoInIndexedDB(
  photoId: string,
  updates: Partial<LocalPhoto>
): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    const getRequest = objectStore.get(photoId);

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    getRequest.onsuccess = () => {
      const record = getRequest.result as LocalPhotoRecord;

      if (!record) {
        reject(new Error(`Photo with id ${photoId} not found`));
        return;
      }

      // Convert constructions to plain array to avoid Vue proxy issues
      const constructions = updates.constructions
        ? [...updates.constructions]
        : record.constructions;

      const updatedRecord: LocalPhotoRecord = {
        ...record,
        constructions,
        space: updates.space !== undefined ? updates.space : record.space,
        status: updates.status !== undefined ? updates.status : record.status,
        pendingType: updates.pendingType !== undefined ? updates.pendingType : record.pendingType,
        note: updates.note !== undefined ? updates.note : record.note,
        synced: updates.synced !== undefined ? updates.synced : record.synced,
        syncStatus: updates.syncStatus !== undefined ? updates.syncStatus : record.syncStatus,
        isDeleted:
          updates.isDeleted !== undefined ? updates.isDeleted : (record.isDeleted ?? false),
        isDirty: updates.isDirty !== undefined ? updates.isDirty : (record.isDirty ?? false),
        updatedBy:
          updates.updatedBy !== undefined
            ? updates.updatedBy
            : (record.updatedBy ?? UpdateSource.APP),
        syncLevel: updates.syncLevel !== undefined ? updates.syncLevel : record.syncLevel,
        isEvidence: updates.isEvidence !== undefined ? updates.isEvidence : record.isEvidence,
        trashedAt: updates.trashedAt !== undefined ? updates.trashedAt : record.trashedAt,
        isSampled: updates.isSampled !== undefined ? updates.isSampled : record.isSampled,
        isReported: updates.isReported !== undefined ? updates.isReported : record.isReported,
        reportNote: updates.reportNote !== undefined ? updates.reportNote : record.reportNote,
        resolvedAt: updates.resolvedAt !== undefined ? updates.resolvedAt : record.resolvedAt,
        parentPhotoId:
          updates.parentPhotoId !== undefined ? updates.parentPhotoId : record.parentPhotoId,
        relatedPhotoIds:
          updates.relatedPhotoIds !== undefined
            ? [...updates.relatedPhotoIds]
            : record.relatedPhotoIds,
        shares: updates.shares ? [...updates.shares] : record.shares,
        updatedAt: updates.updatedAt ? new Date(updates.updatedAt) : new Date(),
      };

      const putRequest = objectStore.put(updatedRecord);

      putRequest.onerror = () => {
        reject(putRequest.error);
      };

      // Use transaction.oncomplete instead of putRequest.onsuccess
      // oncomplete fires after the entire transaction is committed
      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = () => {
        reject(transaction.error);
      };
    };
  });
}

/**
 * Soft delete a photo in IndexedDB
 */
export async function softDeletePhotoInIndexedDB(photoId: string): Promise<void> {
  return updatePhotoInIndexedDB(photoId, {
    isDeleted: true,
    synced: false,
    syncStatus: SyncStatus.PENDING,
  });
}

/**
 * Delete a photo from IndexedDB
 * Deletes both the photo metadata and the blob file in a single transaction
 */
export async function deletePhotoFromIndexedDB(photoId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    // Delete the record and blob in the same transaction
    const deleteRequest = objectStore.delete(photoId);
    const blobKey = `blob_${photoId}`;
    const blobDeleteRequest = objectStore.delete(blobKey);

    let deleteCount = 0;
    const checkCompletion = () => {
      deleteCount++;
      if (deleteCount === 2) {
        resolve();
      }
    };

    deleteRequest.onerror = () => {
      reject(deleteRequest.error);
    };

    deleteRequest.onsuccess = () => {
      checkCompletion();
    };

    blobDeleteRequest.onerror = () => {
      reject(blobDeleteRequest.error);
    };

    blobDeleteRequest.onsuccess = () => {
      checkCompletion();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Get all photos from trash (isDeleted=true with trashedAt set)
 * Returns photos with their blobs included
 */
export async function getTrashPhotosFromIndexedDB(): Promise<LocalPhoto[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = async () => {
      const records = request.result as LocalPhotoRecord[];
      const trashRecords = records.filter((r) => r.isDeleted && r.trashedAt);
      const photos: LocalPhoto[] = [];
      let completed = 0;

      if (trashRecords.length === 0) {
        resolve(photos);
        return;
      }

      for (const record of trashRecords) {
        const blobKey = `blob_${record.id}`;
        const blobRequest = objectStore.get(blobKey);

        blobRequest.onsuccess = () => {
          const blobRecord = blobRequest.result as Record<string, unknown>;
          if (blobRecord) {
            photos.push({
              id: record.id,
              file: blobRecord.blob as Blob,
              takenAt: new Date(record.takenAt),
              projectId: record.projectId || '',
              constructions: record.constructions,
              space: record.space,
              status: record.status,
              pendingType: record.pendingType,
              note: record.note,
              synced: record.synced,
              syncStatus: record.syncStatus,
              isDeleted: record.isDeleted || false,
              isDirty: record.isDirty || false,
              updatedBy: record.updatedBy || UpdateSource.APP,
              userId: record.userId,
              uploadedBy: record.uploadedBy,
              syncLevel: record.syncLevel || 'none',
              isEvidence: record.isEvidence || false,
              trashedAt: record.trashedAt,
              isSampled: record.isSampled || false,
              isReported: record.isReported || false,
              reportNote: record.reportNote,
              shares: record.shares || [],
              createdAt: record.createdAt,
              updatedAt: record.updatedAt,
            });
          }
          completed++;
          if (completed === trashRecords.length) {
            resolve(photos);
          }
        };

        blobRequest.onerror = () => {
          logWarn('[getTrashPhotosFromIndexedDB] Blob missing for photo:', record.id, 'IndexedDB');
          completed++;
          if (completed === trashRecords.length) {
            resolve(photos);
          }
        };
      }
    };
  });
}

/**
 * Get trash photos for a specific project from IndexedDB
 * Returns photos with isDeleted=true and trashedAt set for the given project
 */
export async function getTrashPhotosByProjectFromIndexedDB(
  projectId: string
): Promise<LocalPhoto[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);
    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const allRecords = request.result as LocalPhotoRecord[];
      const projectTrashPhotos: LocalPhoto[] = [];

      // Filter trash photos by projectId and get their blobs
      const blobPromises = allRecords
        .filter((record) => record.projectId === projectId && record.isDeleted && record.trashedAt)
        .map((record) => {
          return new Promise<LocalPhoto>((blobResolve, blobReject) => {
            const blobKey = `blob_${record.id}`;
            const blobRequest = objectStore.get(blobKey);

            blobRequest.onerror = () => {
              blobReject(blobRequest.error);
            };

            blobRequest.onsuccess = () => {
              const blobRecord = blobRequest.result;
              if (blobRecord && blobRecord.blob) {
                projectTrashPhotos.push({
                  id: record.id,
                  file: blobRecord.blob as Blob,
                  takenAt: new Date(record.takenAt),
                  projectId: record.projectId || '',
                  constructions: record.constructions,
                  space: record.space,
                  status: record.status,
                  pendingType: record.pendingType,
                  note: record.note,
                  synced: record.synced,
                  syncStatus: record.syncStatus,
                  isDeleted: record.isDeleted || false,
                  isDirty: record.isDirty || false,
                  updatedBy: record.updatedBy || UpdateSource.APP,
                  userId: record.userId,
                  uploadedBy: record.uploadedBy,
                  syncLevel: record.syncLevel || 'none',
                  isEvidence: record.isEvidence || false,
                  trashedAt: record.trashedAt,
                  isSampled: record.isSampled || false,
                  isReported: record.isReported || false,
                  reportNote: record.reportNote,
                  shares: record.shares || [],
                  createdAt: record.createdAt,
                  updatedAt: record.updatedAt,
                });
              }
              blobResolve(projectTrashPhotos[projectTrashPhotos.length - 1]);
            };
          });
        });

      Promise.all(blobPromises)
        .then(() => {
          resolve(projectTrashPhotos);
        })
        .catch((error) => {
          reject(error);
        });
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Save a project to IndexedDB
 */
export async function saveProjectToIndexedDB(project: Project): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const request = objectStore.put(project);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Get all projects from IndexedDB
 */
export async function getProjectsFromIndexedDB(): Promise<Project[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const projects = request.result as Project[];
      // 過濾掉已刪除的專案
      const activeProjects = projects.filter((p) => !p.isDeleted);
      resolve(activeProjects);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Update a project in IndexedDB
 */
export async function updateProjectInIndexedDB(
  projectId: string,
  updates: Partial<Project>
): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const getRequest = objectStore.get(projectId);

    getRequest.onerror = () => {
      reject(getRequest.error);
    };

    getRequest.onsuccess = () => {
      const project = getRequest.result as Project;

      if (!project) {
        reject(new Error(`Project with id ${projectId} not found`));
        return;
      }

      const updatedProject: Project = {
        ...project,
        ...updates,
        updatedAt: new Date(),
      };

      const putRequest = objectStore.put(updatedProject);

      putRequest.onerror = () => {
        reject(putRequest.error);
      };

      putRequest.onsuccess = () => {
        resolve();
      };
    };
  });
}

/**
 * Get a project by ID from IndexedDB
 */
export async function getProjectFromIndexedDB(projectId: string): Promise<Project | null> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const request = objectStore.get(projectId);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const project = request.result as Project | undefined;
      resolve(project || null);
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

export async function softDeleteProjectInIndexedDB(projectId: string): Promise<void> {
  return updateProjectInIndexedDB(projectId, {
    isDeleted: true,
    synced: false,
    syncStatus: SyncStatus.PENDING,
  });
}

/**
 * Delete a project from IndexedDB
 */
export async function deleteProjectFromIndexedDB(projectId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([PROJECTS_STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const request = objectStore.delete(projectId);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Get all photos for a specific project from IndexedDB
 */
export async function getPhotosByProjectFromIndexedDB(projectId: string): Promise<LocalPhoto[]> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const objectStore = transaction.objectStore(STORE_NAME);

    const request = objectStore.getAll();

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      const allRecords = request.result as LocalPhotoRecord[];
      const projectPhotos: LocalPhoto[] = [];

      // Filter photos by projectId and get their blobs
      const blobPromises = allRecords
        .filter((record) => record.projectId === projectId && record.isDeleted !== true)
        .map((record) => {
          return new Promise<LocalPhoto>((blobResolve, blobReject) => {
            const blobKey = `blob_${record.id}`;
            const blobRequest = objectStore.get(blobKey);

            blobRequest.onerror = () => {
              blobReject(blobRequest.error);
            };

            blobRequest.onsuccess = () => {
              const blobRecord = blobRequest.result;
              if (blobRecord && blobRecord.blob) {
                projectPhotos.push({
                  id: record.id,
                  file: blobRecord.blob as Blob,
                  takenAt: new Date(record.takenAt),
                  projectId: record.projectId || '',
                  constructions: record.constructions,
                  space: record.space,
                  status: record.status,
                  pendingType: record.pendingType,
                  note: record.note,
                  synced: record.synced,
                  syncStatus: record.syncStatus,
                  isDeleted: record.isDeleted || false,
                  isDirty: record.isDirty || false,
                  updatedBy: record.updatedBy || UpdateSource.APP,
                  userId: record.userId,
                  uploadedBy: record.uploadedBy,
                  syncLevel: record.syncLevel || 'none',
                  isEvidence: record.isEvidence || false,
                  trashedAt: record.trashedAt,
                  isSampled: record.isSampled || false,
                  isReported: record.isReported || false,
                  reportNote: record.reportNote,
                  shares: record.shares || [],
                  createdAt: record.createdAt,
                  updatedAt: record.updatedAt,
                });
              }
              blobResolve(projectPhotos[projectPhotos.length - 1]);
            };
          });
        });

      Promise.all(blobPromises)
        .then(() => {
          resolve(projectPhotos);
        })
        .catch((error) => {
          reject(error);
        });
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Delete a project and all its associated photos from IndexedDB
 */
export async function deleteProjectAndPhotosFromIndexedDB(projectId: string): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, PROJECTS_STORE_NAME], 'readwrite');
    const photoStore = transaction.objectStore(STORE_NAME);
    const projectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    // First, get all photos for this project
    const getAllRequest = photoStore.getAll();

    getAllRequest.onerror = () => {
      reject(getAllRequest.error);
    };

    getAllRequest.onsuccess = () => {
      const allRecords = getAllRequest.result as LocalPhotoRecord[];
      const projectPhotos = allRecords.filter((record) => record.projectId === projectId);

      // Delete all photos and their blobs
      const deletePromises = projectPhotos.map((photo) => {
        return new Promise<void>((deleteResolve, deleteReject) => {
          // Delete photo record
          const deletePhotoRequest = photoStore.delete(photo.id);
          // Delete photo blob
          const deleteBlobRequest = photoStore.delete(`blob_${photo.id}`);

          let completedRequests = 0;
          const checkCompletion = () => {
            completedRequests++;
            if (completedRequests === 2) {
              deleteResolve();
            }
          };

          deletePhotoRequest.onerror = () => deleteReject(deletePhotoRequest.error);
          deletePhotoRequest.onsuccess = checkCompletion;

          deleteBlobRequest.onerror = () => deleteReject(deleteBlobRequest.error);
          deleteBlobRequest.onsuccess = checkCompletion;
        });
      });

      // Delete the project itself
      const deleteProjectRequest = projectStore.delete(projectId);

      deleteProjectRequest.onerror = () => {
        reject(deleteProjectRequest.error);
      };

      deleteProjectRequest.onsuccess = () => {
        // Wait for all photo deletions to complete
        Promise.all(deletePromises)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      };
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Clear all local IndexedDB data (photos + projects)
 */
export async function clearAllDataFromIndexedDB(): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME, PROJECTS_STORE_NAME], 'readwrite');
    const photoStore = transaction.objectStore(STORE_NAME);
    const projectStore = transaction.objectStore(PROJECTS_STORE_NAME);

    const clearPhotosRequest = photoStore.clear();
    const clearProjectsRequest = projectStore.clear();

    let doneCount = 0;
    const checkDone = () => {
      doneCount++;
      if (doneCount === 2) {
        resolve();
      }
    };

    clearPhotosRequest.onerror = () => {
      reject(clearPhotosRequest.error);
    };
    clearPhotosRequest.onsuccess = checkDone;

    clearProjectsRequest.onerror = () => {
      reject(clearProjectsRequest.error);
    };
    clearProjectsRequest.onsuccess = checkDone;

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
}

/**
 * Mark photos as reported (used in report generation) and upgrade to Layer 3
 */
export async function markPhotosAsReportedInIndexedDB(photoIds: string[]): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    let completed = 0;
    let hasError = false;

    if (photoIds.length === 0) {
      resolve();
      return;
    }

    photoIds.forEach((id) => {
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        if (hasError) return;
        const record = getRequest.result as LocalPhotoRecord;

        if (record) {
          const updatedRecord: LocalPhotoRecord = {
            ...record,
            isReported: true,
            syncLevel: PhotoSyncLevel.EVIDENCE,
            isEvidence: true,
            synced: false,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          };

          const putRequest = objectStore.put(updatedRecord);
          putRequest.onsuccess = () => {
            completed++;
            if (completed === photoIds.length) {
              resolve();
            }
          };
          putRequest.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(putRequest.error);
            }
          };
        } else {
          completed++;
          if (completed === photoIds.length) {
            resolve();
          }
        }
      };

      getRequest.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(getRequest.error);
        }
      };
    });
  });
}

/**
 * Add share record to multiple photos in IndexedDB
 */
export async function addShareToPhotosInIndexedDB(
  photoIds: string[],
  share: PhotoShare
): Promise<void> {
  const database = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const objectStore = transaction.objectStore(STORE_NAME);

    let completed = 0;
    let hasError = false;

    if (photoIds.length === 0) {
      resolve();
      return;
    }

    photoIds.forEach((id) => {
      const getRequest = objectStore.get(id);

      getRequest.onsuccess = () => {
        if (hasError) return;
        const record = getRequest.result as LocalPhotoRecord;

        if (record) {
          const updatedRecord: LocalPhotoRecord = {
            ...record,
            shares: [...(record.shares || []), share],
            syncLevel: PhotoSyncLevel.EVIDENCE,
            isEvidence: true,
            synced: false,
            syncStatus: SyncStatus.PENDING,
            updatedAt: new Date(),
          };

          const putRequest = objectStore.put(updatedRecord);
          putRequest.onsuccess = () => {
            completed++;
            if (completed === photoIds.length) {
              resolve();
            }
          };
          putRequest.onerror = () => {
            if (!hasError) {
              hasError = true;
              reject(putRequest.error);
            }
          };
        } else {
          completed++;
          if (completed === photoIds.length) {
            resolve();
          }
        }
      };

      getRequest.onerror = () => {
        if (!hasError) {
          hasError = true;
          reject(getRequest.error);
        }
      };
    });
  });
}
