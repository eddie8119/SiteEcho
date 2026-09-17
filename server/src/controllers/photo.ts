import { Buffer } from 'buffer';
import camelcaseKeys from 'camelcase-keys';
import { Request, Response } from 'express';
import snakecaseKeys from 'snakecase-keys';

import { supabaseAdmin } from '@/lib/supabase';
import { AuthenticatedRequest } from '@/types/requests';
import { assertProjectAccess } from '@/utils/accessControl';
import { AppError, handleControllerError } from '@/utils/controllerError';
import { checkUserStorageQuota } from '@/utils/storageGuard';

const BUCKET = 'photos';

enum PhotoSyncLevel {
  NONE = 'none', // Layer 1: Local only
  THUMBNAIL = 'thumbnail', // Layer 2: Cloud thumbnail
  EVIDENCE = 'evidence', // Layer 3: Cloud high-quality
}

interface PhotoSyncInputItem {
  client_id: string;
  project_id?: string | null;
  taken_at: string;
  constructions?: string[] | null;
  space?: string | null;
  status?: string;
  pending_type?: string | null;
  note?: string | null;
  report_note?: string | null;
  parent_photo_id?: string | null;
  related_photo_ids?: string[] | null;
  // base64-encoded file (data URI or raw base64)
  // Optional for soft delete (deleted_at provided) or restore (deleted_at: null)
  file_base64?: string;
  mime_type?: string;
  sync_level?: PhotoSyncLevel;
  is_evidence?: boolean;
  is_sampled?: boolean;
  is_reported?: boolean;
  shares?: Record<string, unknown>[] | null;
  deleted_at?: string | null;
}

interface PhotoSyncResultItem {
  client_id: string;
  success: boolean;
  id?: string;
  error?: string;
}

const stripBase64Prefix = (b64: string) => {
  const commaIdx = b64.indexOf(',');
  if (b64.startsWith('data:') && commaIdx !== -1) {
    return b64.substring(commaIdx + 1);
  }
  return b64;
};

const uniqueStrings = (values: string[]) => [
  ...new Set(values.filter((value) => value.length > 0)),
];

const updateParentRelatedPhotoIds = async (
  userId: string,
  affectedPhotos: Array<{ client_id: string; parent_photo_id?: string | null }>,
  mode: 'add' | 'remove',
  client = supabaseAdmin
) => {
  const parentGroups = new Map<string, string[]>();

  for (const photo of affectedPhotos) {
    if (!photo.parent_photo_id) {
      continue;
    }

    const parentId = photo.parent_photo_id;
    const childIds = parentGroups.get(parentId) || [];
    childIds.push(photo.client_id);
    parentGroups.set(parentId, childIds);
  }

  for (const [parentId, childIds] of parentGroups.entries()) {
    const { data: parentPhoto, error: parentFetchError } = await client
      .from('Photos')
      .select('related_photo_ids')
      .eq('user_id', userId)
      .eq('client_id', parentId)
      .maybeSingle();

    if (parentFetchError || !parentPhoto) {
      console.warn(`[photo:${mode}] Failed to fetch parent ${parentId} for relation update:`);
      continue;
    }

    const currentRelatedPhotoIds = Array.isArray(parentPhoto.related_photo_ids)
      ? (parentPhoto.related_photo_ids as string[])
      : [];

    const nextRelatedPhotoIds =
      mode === 'add'
        ? uniqueStrings([...currentRelatedPhotoIds, ...childIds])
        : currentRelatedPhotoIds.filter((id) => !childIds.includes(id));

    const { error: updateError } = await client
      .from('Photos')
      .update({
        related_photo_ids: nextRelatedPhotoIds,
        updated_by: 'web',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .eq('client_id', parentId);

    if (updateError) {
      console.warn(
        `[photo:${mode}] Failed to update related_photo_ids for parent ${parentId}:`,
        updateError
      );
    }
  }
};

/**
 * Batch sync photos from IndexedDB to Supabase.
 * For each photo:
 *   1. Upload blob to storage bucket `photos` at path `{user_id}/{client_id}.{ext}`
 *   2. Insert row into `Photos` table (unique on user_id + client_id)
 */
export const syncPhotos = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { photos } = req.body as { photos?: PhotoSyncInputItem[] };

    if (!Array.isArray(photos) || photos.length === 0) {
      throw new AppError('No photos provided', {
        statusCode: 400,
        code: 'SYNC_EMPTY_PAYLOAD',
      });
    }

    // Convert camelCase to snake_case for database
    const snakePhotos = snakecaseKeys({ photos }, { deep: true }).photos as PhotoSyncInputItem[];

    const results: PhotoSyncResultItem[] = [];

    for (const item of snakePhotos) {
      try {
        if (!item.client_id || !item.taken_at) {
          results.push({
            client_id: item.client_id || 'unknown',
            success: false,
            error: 'Missing required fields (client_id or taken_at)',
          });
          continue;
        }

        // Handle soft delete (trash): if deleted_at is provided, update the deleted_at field
        if (item.deleted_at) {
          const { data: existing, error: fetchError } = await reqSupabase
            .from('Photos')
            .select('id')
            .eq('user_id', userId)
            .eq('client_id', item.client_id)
            .maybeSingle();

          if (fetchError) {
            results.push({
              client_id: item.client_id,
              success: false,
              error: `Failed to fetch photo for soft delete: ${fetchError.message}`,
            });
            continue;
          }

          if (!existing) {
            // Photo doesn't exist in cloud, skip soft delete
            results.push({ client_id: item.client_id, success: true });
            continue;
          }

          // Update deleted_at for soft delete
          const softDeletePayload: Record<string, unknown> = {
            deleted_at: item.deleted_at,
            updated_by: 'app',
            updated_at: new Date().toISOString(),
          };

          if (item.report_note !== undefined) {
            softDeletePayload.report_note = item.report_note;
          }
          if (item.parent_photo_id !== undefined) {
            softDeletePayload.parent_photo_id = item.parent_photo_id;
          }
          if (item.related_photo_ids !== undefined) {
            softDeletePayload.related_photo_ids = item.related_photo_ids;
          }

          const { error: updateError } = await reqSupabase
            .from('Photos')
            .update(softDeletePayload)
            .eq('id', existing.id)
            .eq('user_id', userId);

          if (updateError) {
            results.push({
              client_id: item.client_id,
              success: false,
              error: `Failed to soft delete: ${updateError.message}`,
            });
            continue;
          }

          results.push({ client_id: item.client_id, success: true, id: existing.id });
          continue;
        }

        // Handle restore: if deleted_at is null and photo exists, clear the deleted_at field
        if (item.deleted_at === null) {
          const { data: existing, error: fetchError } = await reqSupabase
            .from('Photos')
            .select('id')
            .eq('user_id', userId)
            .eq('client_id', item.client_id)
            .maybeSingle();

          if (fetchError) {
            results.push({
              client_id: item.client_id,
              success: false,
              error: `Failed to fetch photo for restore: ${fetchError.message}`,
            });
            continue;
          }

          if (!existing) {
            // Photo doesn't exist in cloud, skip restore
            results.push({ client_id: item.client_id, success: true });
            continue;
          }

          // Clear deleted_at for restore
          const restorePayload: Record<string, unknown> = {
            deleted_at: null,
            updated_by: 'app',
            updated_at: new Date().toISOString(),
          };

          if (item.report_note !== undefined) {
            restorePayload.report_note = item.report_note;
          }
          if (item.parent_photo_id !== undefined) {
            restorePayload.parent_photo_id = item.parent_photo_id;
          }
          if (item.related_photo_ids !== undefined) {
            restorePayload.related_photo_ids = item.related_photo_ids;
          }

          const { error: updateError } = await reqSupabase
            .from('Photos')
            .update(restorePayload)
            .eq('id', existing.id)
            .eq('user_id', userId);

          if (updateError) {
            results.push({
              client_id: item.client_id,
              success: false,
              error: `Failed to restore: ${updateError.message}`,
            });
            continue;
          }

          results.push({ client_id: item.client_id, success: true, id: existing.id });
          continue;
        }

        // Regular sync: require file_base64
        if (!item.file_base64) {
          results.push({
            client_id: item.client_id,
            success: false,
            error: 'Missing file_base64 for regular sync',
          });
          continue;
        }

        const mimeType = item.mime_type || 'image/jpeg';
        const ext = mimeType.split('/')[1] || 'jpg';
        let photoOwnerId = userId;
        let storageProjectId = item.project_id || null;

        // Project photos are owned and quota-counted by the project owner,
        // even when the upload is performed by a collaborator.
        if (item.project_id) {
          const { project } = await assertProjectAccess(item.project_id, userId);
          photoOwnerId = project.user_id;
          storageProjectId =
            typeof project.client_id === 'string' ? project.client_id : project.id;
        }

        const filePath = `${photoOwnerId}/${item.client_id}.${ext}`;

        // Check if this photo was already synced (idempotent)
        const { data: existing } = await supabaseAdmin
          .from('Photos')
          .select('id, sync_level, file_path, uploaded_by')
          .eq('user_id', photoOwnerId)
          .eq('client_id', item.client_id)
          .maybeSingle();

        if (existing?.id) {
          // A Layer 3 upgrade must replace the existing thumbnail with the high-quality file.
          const isEvidenceUpgrade =
            existing.sync_level !== PhotoSyncLevel.EVIDENCE &&
            item.sync_level === PhotoSyncLevel.EVIDENCE;

          // Check if sync level changed from evidence to thumbnail/none.
          // If so, delete the high-quality file and upload the new one.
          if (
            existing.sync_level === PhotoSyncLevel.EVIDENCE &&
            item.sync_level !== PhotoSyncLevel.EVIDENCE
          ) {
            await supabaseAdmin.storage.from(BUCKET).remove([existing.file_path]);
            // Continue to upload the new (lower quality) file.
          } else if (!isEvidenceUpgrade) {
            // If this is a metadata-only sync, update the row without re-uploading the file.
            if (!item.file_base64) {
              const metadataUpdatePayload: Record<string, unknown> = {
                project_id: storageProjectId,
                taken_at: item.taken_at,
                constructions: item.constructions ?? [],
                space: item.space ?? null,
                status: item.status || 'normal',
                pending_type: item.pending_type ?? null,
                note: item.note ?? '',
                sync_level: item.sync_level || PhotoSyncLevel.NONE,
                is_evidence: item.is_evidence ?? false,
                is_sampled: item.is_sampled ?? false,
                is_reported: item.is_reported ?? false,
                shares: item.shares ?? null,
                updated_by: 'app',
                updated_at: new Date().toISOString(),
              };

              if (item.report_note !== undefined) {
                metadataUpdatePayload.report_note = item.report_note;
              }
              if (item.parent_photo_id !== undefined) {
                metadataUpdatePayload.parent_photo_id = item.parent_photo_id;
              }
              if (item.related_photo_ids !== undefined) {
                metadataUpdatePayload.related_photo_ids = item.related_photo_ids;
              }

              const { error: metadataUpdateError } = await reqSupabase
                .from('Photos')
                .update(metadataUpdatePayload)
                .eq('id', existing.id)
                .eq('user_id', photoOwnerId);

              if (metadataUpdateError) {
                results.push({
                  client_id: item.client_id,
                  success: false,
                  error: `Metadata update failed: ${metadataUpdateError.message}`,
                });
                continue;
              }

              results.push({ client_id: item.client_id, success: true, id: existing.id });
              continue;
            }

            // The cloud already contains this sync level, so no file upload is needed.
            results.push({ client_id: item.client_id, success: true, id: existing.id });
            continue;
          }
        }

        // Decode base64 to Buffer
        const rawBase64 = stripBase64Prefix(item.file_base64);
        const buffer = Buffer.from(rawBase64, 'base64');

        // Check storage quota against the project owner's allowance.
        const quotaCheck = await checkUserStorageQuota(
          photoOwnerId,
          buffer.byteLength,
          storageProjectId
        );
        if (!quotaCheck.allowed) {
          results.push({
            client_id: item.client_id,
            success: false,
            error:
              'STORAGE_LIMIT_EXCEEDED: Cloud storage limit reached. Please upgrade to Pro to resume cloud backup.',
          });
          continue;
        }

        // Upload to Storage using admin client to bypass storage RLS for server-validated requests
        const { error: uploadError } = await supabaseAdmin.storage
          .from(BUCKET)
          .upload(filePath, buffer, {
            contentType: mimeType,
            upsert: true,
          });

        if (uploadError) {
          results.push({
            client_id: item.client_id,
            success: false,
            error: `Storage upload failed: ${uploadError.message}`,
          });
          continue;
        }

        // Upsert row into Photos table using admin client
        const { data: inserted, error: insertError } = await supabaseAdmin
          .from('Photos')
          .upsert(
            [
              {
                client_id: item.client_id,
                user_id: photoOwnerId,
                uploaded_by: userId,
                project_id: storageProjectId,
                file_path: filePath,
                file_size: buffer.byteLength,
                mime_type: mimeType,
                taken_at: item.taken_at,
                constructions: item.constructions ?? [],
                space: item.space ?? null,
                status: item.status || 'normal',
                pending_type: item.pending_type ?? null,
                note: item.note ?? '',
                report_note: item.report_note ?? null,
                parent_photo_id: item.parent_photo_id ?? null,
                related_photo_ids: item.related_photo_ids ?? [],
                sync_level: item.sync_level || PhotoSyncLevel.NONE,
                is_evidence: item.is_evidence ?? false,
                is_sampled: item.is_sampled ?? false,
                is_reported: item.is_reported ?? false,
                shares: item.shares ?? null,
                updated_by: 'app',
                updated_at: new Date().toISOString(),
              },
            ],
            { onConflict: 'user_id, client_id' }
          )
          .select('id')
          .single();

        if (insertError) {
          // Note: we don't necessarily want to delete from storage on upsert fail if it was an update
          results.push({
            client_id: item.client_id,
            success: false,
            error: `DB sync failed: ${insertError.message}`,
          });
          continue;
        }

        results.push({ client_id: item.client_id, success: true, id: inserted.id });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        results.push({ client_id: item.client_id || 'unknown', success: false, error: message });
      }
    }

    const successCount = results.filter((r) => r.success).length;

    return res.status(200).json({
      success: true,
      data: {
        total: snakePhotos.length,
        synced: successCount,
        failed: snakePhotos.length - successCount,
        results,
      },
      message: `Synced ${successCount}/${snakePhotos.length} photos`,
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Photo sync error');
  }
};

/**
 * Batch delete photos from Supabase.
 * Receives a list of client_ids to delete.
 * Also deletes follow-up photos (photos with parent_photo_id pointing to these photos).
 */
export const deletePhotos = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { client_ids } = req.body as { client_ids?: string[] };

    if (!Array.isArray(client_ids) || client_ids.length === 0) {
      return res.status(200).json({ success: true, message: 'No photos to delete' });
    }

    // 1. Fetch targeted photos to check access and project membership
    const { data: targetPhotos, error: fetchTargetError } = await supabaseAdmin
      .from('Photos')
      .select('id, client_id, user_id, project_id, uploaded_by, file_path, parent_photo_id')
      .in('client_id', client_ids);

    if (fetchTargetError) {
      throw new AppError('Failed to fetch photos for deletion', {
        statusCode: 500,
        code: 'PHOTOS_FETCH_FAILED',
        detail: fetchTargetError.message,
      });
    }

    if (!targetPhotos || targetPhotos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No photos to delete',
        data: { deleted: 0, followUpPhotos: 0 },
      });
    }

    // 2. Find follow-up photos (photos with parent_photo_id in client_ids)
    const { data: followUpPhotos, error: followUpError } = await supabaseAdmin
      .from('Photos')
      .select('id, client_id, user_id, project_id, uploaded_by, file_path, parent_photo_id')
      .in('parent_photo_id', client_ids);

    if (followUpError) {
      console.error('[deletePhotos] Failed to fetch follow-up photos:', followUpError);
    }

    const allPhotosToDelete = [...targetPhotos, ...(followUpPhotos || [])];

    // Owners can delete every photo in their project. Collaborators can only
    // delete photos they uploaded themselves. Legacy rows without uploaded_by
    // fall back to the original user_id owner.
    for (const photo of allPhotosToDelete) {
      if (photo.project_id) {
        const { project } = await assertProjectAccess(photo.project_id, userId);
        const isProjectOwner = project.user_id === userId;
        const uploaderId = photo.uploaded_by ?? photo.user_id;
        const isUploader = uploaderId === userId;
        if (!isProjectOwner && !isUploader) {
          throw new AppError('Collaborators can only delete photos they uploaded', {
            statusCode: 403,
            code: 'PHOTO_DELETE_FORBIDDEN',
          });
        }
      } else if (photo.user_id !== userId && photo.uploaded_by !== userId) {
        throw new AppError('You do not have permission to delete this photo', {
          statusCode: 403,
          code: 'PHOTO_DELETE_FORBIDDEN',
        });
      }
    }

    const followUpClientIds = followUpPhotos?.map((p) => p.client_id) || [];
    const allClientIdsToDelete = [
      ...new Set(allPhotosToDelete.map((p) => p.client_id).filter(Boolean)),
    ];
    const allDbIdsToDelete = [...new Set(allPhotosToDelete.map((p) => p.id).filter(Boolean))];
    const filePaths = allPhotosToDelete.map((p) => p.file_path).filter(Boolean);

    // 4. Delete from Storage
    if (filePaths.length > 0) {
      await supabaseAdmin.storage.from(BUCKET).remove(filePaths);
    }

    // 5. Delete from DB using admin client so collaborator deletions work on project photos
    const { error: deleteError } = await supabaseAdmin
      .from('Photos')
      .delete()
      .in('id', allDbIdsToDelete);

    if (deleteError) {
      throw new AppError('Failed to delete photos from DB', {
        statusCode: 500,
        code: 'PHOTOS_DELETE_FAILED',
        detail: deleteError.message,
      });
    }

    const affectedPhotos = allPhotosToDelete.map((p) => ({
      client_id: p.client_id,
      parent_photo_id: p.parent_photo_id,
    }));
    if (affectedPhotos.length > 0) {
      await updateParentRelatedPhotoIds(userId, affectedPhotos, 'remove');
    }

    return res.status(200).json({
      success: true,
      message: `Successfully deleted ${allClientIdsToDelete.length} photos (including ${followUpClientIds.length} follow-up photos)`,
      data: {
        deleted: allClientIdsToDelete.length,
        followUpPhotos: followUpClientIds.length,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Photo delete error');
  }
};

/**
 * Update photo metadata from Web.
 * Only allows editing: note, space, status, pending_type, constructions.
 * Always sets updated_by = 'web'.
 */
export const updatePhoto = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError('Missing photo id', { statusCode: 400, code: 'MISSING_PHOTO_ID' });
    }

    const body = snakecaseKeys(req.body as Record<string, unknown>, { deep: true }) as {
      note?: string;
      report_note?: string | null;
      space?: string;
      status?: string;
      pending_type?: string | null;
      constructions?: string[];
      parent_photo_id?: string | null;
      related_photo_ids?: string[];
      sync_level?: PhotoSyncLevel;
      is_evidence?: boolean;
    };

    const allowedFields = [
      'note',
      'report_note',
      'space',
      'status',
      'pending_type',
      'constructions',
      'parent_photo_id',
      'related_photo_ids',
      'sync_level',
      'is_evidence',
    ] as const;
    const now = new Date().toISOString();
    const updatePayload: Record<string, unknown> = { updated_by: 'web', updated_at: now };

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updatePayload[field] = body[field];
      }
    }

    // If status is being set to 'resolved', also set 'resolved_at'
    if (body.status === 'resolved') {
      updatePayload.resolved_at = now;
    }

    const { data: existing, error: fetchError } = await reqSupabase
      .from('Photos')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError || !existing) {
      throw new AppError('Photo not found', { statusCode: 404, code: 'PHOTO_NOT_FOUND' });
    }

    const { data: updated, error: updateError } = await reqSupabase
      .from('Photos')
      .update(updatePayload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError || !updated) {
      throw new AppError('Failed to update photo', { statusCode: 500, code: 'UPDATE_FAILED' });
    }

    res.json({ success: true, data: updated });
  } catch (error) {
    handleControllerError(res, error, 'Photo update error');
  }
};

/**
 * Batch update photo metadata from App.
 * Allows editing: note, space, status, pending_type, constructions.
 * Uses client_id to identify photos.
 * Always sets updated_by = 'app'.
 */
export const batchUpdatePhotos = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const body = snakecaseKeys(req.body as Record<string, unknown>, { deep: true }) as {
      photos: Array<{
        client_id: string;
        note?: string;
        report_note?: string;
        space?: string;
        status?: string;
        pending_type?: string | null;
        constructions?: string[];
        parent_photo_id?: string | null;
        related_photo_ids?: string[];
        sync_level?: PhotoSyncLevel;
        is_evidence?: boolean;
      }>;
    };

    if (!body.photos || !Array.isArray(body.photos)) {
      throw new AppError('Missing photos array', { statusCode: 400, code: 'MISSING_PHOTOS_ARRAY' });
    }

    const allowedFields = [
      'note',
      'report_note',
      'space',
      'status',
      'pending_type',
      'constructions',
      'parent_photo_id',
      'related_photo_ids',
      'sync_level',
      'is_evidence',
    ] as const;
    const results = [];

    for (const photo of body.photos) {
      if (!photo.client_id) {
        results.push({
          client_id: 'unknown',
          success: false,
          error: 'Missing client_id',
        });
        continue;
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = { updated_by: 'app', updated_at: now };

      for (const field of allowedFields) {
        if (photo[field] !== undefined) {
          updatePayload[field] = photo[field];
        }
      }

      if (photo.status === 'resolved') {
        updatePayload.resolved_at = now;
      }

      // Find photo by client_id
      const { data: existing, error: fetchError } = await reqSupabase
        .from('Photos')
        .select('id')
        .eq('client_id', photo.client_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError || !existing) {
        results.push({
          client_id: photo.client_id,
          success: false,
          error: 'Photo not found',
        });
        continue;
      }

      // Update photo
      const { data: updated, error: updateError } = await reqSupabase
        .from('Photos')
        .update(updatePayload)
        .eq('id', existing.id)
        .eq('user_id', userId)
        .select()
        .single();

      if (updateError || !updated) {
        results.push({
          client_id: photo.client_id,
          success: false,
          error: 'Failed to update',
        });
        continue;
      }

      results.push({
        client_id: photo.client_id,
        success: true,
        data: camelcaseKeys(updated, { deep: true }),
      });
    }

    const total = results.length;
    const synced = results.filter((r) => r.success).length;
    const failed = total - synced;

    res.json({
      success: true,
      data: {
        total,
        synced,
        failed,
        results,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Photo batch update error');
  }
};

/**
 * Delete a single photo by server UUID from Web.
 * Blocks deletion of is_evidence = true photos (Layer 3 protection).
 */
export const deletePhotoById = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { id } = req.params;
    if (!id) {
      throw new AppError('Missing photo id', { statusCode: 400, code: 'MISSING_PHOTO_ID' });
    }

    const { data: photo, error: fetchError } = await supabaseAdmin
      .from('Photos')
      .select('id, file_path, is_evidence, deleted_at, user_id, project_id, uploaded_by')
      .eq('id', id)
      .maybeSingle();

    if (fetchError || !photo) {
      throw new AppError('Photo not found', { statusCode: 404, code: 'PHOTO_NOT_FOUND' });
    }

    if (photo.project_id) {
      const { project } = await assertProjectAccess(photo.project_id, userId);
      const isProjectOwner = project.user_id === userId;
      const uploaderId = photo.uploaded_by ?? photo.user_id;
      const isUploader = uploaderId === userId;
      if (!isProjectOwner && !isUploader) {
        throw new AppError('Collaborators can only delete photos they uploaded', {
          statusCode: 403,
          code: 'PHOTO_DELETE_FORBIDDEN',
        });
      }
    } else if (photo.user_id !== userId && photo.uploaded_by !== userId) {
      throw new AppError('Photo not found', { statusCode: 404, code: 'PHOTO_NOT_FOUND' });
    }

    // 禁止刪除 is_evidence 的照片，但如果照片已在垃圾桶中（deleted_at 不為空）則允許永久刪除
    if (photo.is_evidence && !photo.deleted_at) {
      throw new AppError('Evidence photos cannot be deleted from Web', {
        statusCode: 403,
        code: 'EVIDENCE_DELETE_FORBIDDEN',
      });
    }

    await supabaseAdmin.storage.from(BUCKET).remove([photo.file_path]);

    const { error: deleteError } = await supabaseAdmin
      .from('Photos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new AppError('Failed to delete photo', {
        statusCode: 500,
        code: 'PHOTO_DELETE_FAILED',
        detail: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Photo deleted successfully',
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Photo delete by id error');
  }
};

/**
 * Get all synced photos for the current user.
 * Returns metadata + signed URLs for storage access.
 * Optionally filters by project_id query parameter.
 * By default, filters out soft-deleted photos. Use include_deleted=true to include them.
 * Use only_deleted=true to fetch only soft-deleted photos.
 */
export const getUserPhotos = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { project_id: projectId, include_deleted, only_deleted } = req.query;

    let query = supabaseAdmin.from('Photos').select('*');
    let project: { id: string; user_id: string; client_id?: string } | null = null;

    // Filter by project_id if provided
    if (projectId && typeof projectId === 'string') {
      const { project: resolvedProject } = await assertProjectAccess(projectId, userId);
      project = resolvedProject;
      // Allow viewing photos for project owners and collaborators
      query = query.or(
        `project_id.eq.${project.id},project_id.eq.${project.client_id || project.id}`
      );
    } else {
      query = query.eq('user_id', userId);
    }

    // Handle deleted photo filtering
    if (only_deleted === 'true') {
      // Fetch only soft-deleted photos
      query = query.not('deleted_at', 'is', null);
    } else if (include_deleted !== 'true') {
      // Filter out soft-deleted photos unless explicitly requested
      query = query.is('deleted_at', null);
    }

    const { data: rawPhotos, error } = await query.order('taken_at', { ascending: false });

    if (error) {
      throw new AppError('Failed to fetch photos', {
        statusCode: 500,
        code: 'PHOTOS_FETCH_FAILED',
        detail: error.message,
        exposeError: true,
      });
    }

    // Deduplicate by client_id. Prefer the canonical project-owner row when
    // legacy user-scoped duplicates exist from before shared-project ownership.
    const photos: typeof rawPhotos = [];
    const clientIdMap = new Map<string, (typeof rawPhotos)[number]>();
    for (const photo of rawPhotos || []) {
      const clientId = photo.client_id;
      if (!clientId) {
        photos.push(photo);
        continue;
      }
      const existing = clientIdMap.get(clientId);
      if (!existing) {
        clientIdMap.set(clientId, photo);
        continue;
      }
      const isBetter =
        (photo.uploaded_by && photo.user_id === project?.user_id) ||
        (!existing.uploaded_by && photo.uploaded_by) ||
        (photo.user_id === project?.user_id && existing.user_id !== project?.user_id);
      if (isBetter) {
        clientIdMap.set(clientId, photo);
      }
    }
    for (const photo of clientIdMap.values()) {
      photos.push(photo);
    }

    // Generate signed URLs (1 hour expiry) for each photo
    const withUrls = await Promise.all(
      (photos || []).map(async (photo) => {
        const { data: signed } = await supabaseAdmin.storage
          .from(BUCKET)
          .createSignedUrl(photo.file_path, 3600);
        return {
          ...photo,
          url: signed?.signedUrl || null,
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: camelcaseKeys(withUrls, { deep: true }),
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Get user photos error');
  }
};

/**
 * Permanently delete expired photos from trash (older than 30 days)
 * This should be called periodically (e.g., via cron job)
 */
export const cleanupExpiredTrash = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    // Find photos deleted more than 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: expiredPhotos, error: fetchError } = await reqSupabase
      .from('Photos')
      .select('id, file_path, client_id')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    if (fetchError) {
      throw new AppError('Failed to fetch expired photos', {
        statusCode: 500,
        code: 'EXPIRED_PHOTOS_FETCH_FAILED',
        detail: fetchError.message,
      });
    }

    if (!expiredPhotos || expiredPhotos.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No expired photos to clean up',
        data: { deleted: 0 },
      });
    }

    // Delete files from storage
    const filePaths = expiredPhotos.map((p) => p.file_path);
    if (filePaths.length > 0) {
      await reqSupabase.storage.from(BUCKET).remove(filePaths);
    }

    // Delete records from database
    const { error: deleteError } = await reqSupabase
      .from('Photos')
      .delete()
      .eq('user_id', userId)
      .lt('deleted_at', thirtyDaysAgo.toISOString());

    if (deleteError) {
      throw new AppError('Failed to delete expired photos from DB', {
        statusCode: 500,
        code: 'EXPIRED_PHOTOS_DELETE_FAILED',
        detail: deleteError.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully cleaned up ${expiredPhotos.length} expired photos`,
      data: { deleted: expiredPhotos.length },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Cleanup expired trash error');
  }
};

/**
 * Batch soft delete photos (move to trash) from Web.
 * Receives a list of server UUIDs to soft delete.
 */
export const softDeleteBatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { ids } = req.body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ success: true, message: 'No photos to delete' });
    }

    // Find follow-up photos so they move to trash together with the parent photos
    const { data: followUpPhotos, error: followUpError } = await reqSupabase
      .from('Photos')
      .select('client_id')
      .eq('user_id', userId)
      .in('parent_photo_id', ids);

    if (followUpError) {
      console.error('[softDeleteBatch] Failed to fetch follow-up photos:', followUpError);
      // Continue with soft delete even if the follow-up lookup fails
    }

    const followUpClientIds = followUpPhotos?.map((p) => p.client_id) || [];
    const allClientIdsToDelete = [...new Set([...ids, ...followUpClientIds])];

    const { data: affectedPhotos, error: affectedFetchError } = await reqSupabase
      .from('Photos')
      .select('client_id, parent_photo_id')
      .eq('user_id', userId)
      .in('client_id', allClientIdsToDelete);

    if (affectedFetchError) {
      console.warn(
        '[softDeleteBatch] Failed to fetch affected photos for relation cleanup:',
        affectedFetchError
      );
    }

    const { error: updateError } = await reqSupabase
      .from('Photos')
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: 'web',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .in('client_id', allClientIdsToDelete); // Changed from 'id' to 'client_id' to sync with mobile

    if (updateError) {
      throw new AppError('Failed to soft delete photos', {
        statusCode: 500,
        code: 'SOFT_DELETE_FAILED',
        detail: updateError.message,
      });
    }

    if (affectedPhotos && affectedPhotos.length > 0) {
      await updateParentRelatedPhotoIds(userId, affectedPhotos, 'remove');
    }

    return res.status(200).json({
      success: true,
      message: `Successfully moved ${allClientIdsToDelete.length} photos to trash (including ${followUpClientIds.length} follow-up photos)`,
      data: {
        deleted: allClientIdsToDelete.length,
        followUpPhotos: followUpClientIds.length,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Soft delete batch error');
  }
};

/**
 * Batch restore photos from trash from Web.
 * Receives a list of clientIds to restore.
 * Also restores follow-up photos (photos with parent_photo_id pointing to these photos).
 */
export const restoreBatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const reqSupabase = (req as AuthenticatedRequest).supabase || supabaseAdmin;
    if (!userId) {
      throw new AppError('Unauthorized', { statusCode: 401, code: 'UNAUTHENTICATED' });
    }

    const { ids } = req.body as { ids?: string[] };

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(200).json({ success: true, message: 'No photos to restore' });
    }

    // 1. Find follow-up photos (photos with parent_photo_id in the list of client_ids)
    const { data: followUpPhotos, error: followUpError } = await reqSupabase
      .from('Photos')
      .select('client_id')
      .eq('user_id', userId)
      .in('parent_photo_id', ids);

    if (followUpError) {
      console.error('[restoreBatch] Failed to fetch follow-up photos:', followUpError);
      // Continue with restoration even if follow-up check fails
    }

    const followUpClientIds = followUpPhotos?.map((p) => p.client_id) || [];
    const allClientIdsToRestore = [...new Set([...ids, ...followUpClientIds])];

    // 2. Restore from DB (clear deleted_at)
    const { error: updateError } = await reqSupabase
      .from('Photos')
      .update({ deleted_at: null, updated_by: 'web', updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('client_id', allClientIdsToRestore);

    if (updateError) {
      throw new AppError('Failed to restore photos', {
        statusCode: 500,
        code: 'RESTORE_FAILED',
        detail: updateError.message,
      });
    }

    const { data: restoredPhotos, error: restoredFetchError } = await reqSupabase
      .from('Photos')
      .select('client_id, parent_photo_id')
      .eq('user_id', userId)
      .in('client_id', allClientIdsToRestore);

    if (restoredFetchError) {
      console.warn(
        '[restoreBatch] Failed to fetch restored photos for relation cleanup:',
        restoredFetchError
      );
    }

    if (restoredPhotos && restoredPhotos.length > 0) {
      await updateParentRelatedPhotoIds(userId, restoredPhotos, 'add');
    }

    return res.status(200).json({
      success: true,
      message: `Successfully restored ${allClientIdsToRestore.length} photos (including ${followUpClientIds.length} follow-up photos)`,
      data: {
        restored: allClientIdsToRestore.length,
        followUpPhotos: followUpClientIds.length,
      },
    });
  } catch (error: unknown) {
    return handleControllerError(res, error, 'Restore batch error');
  }
};
