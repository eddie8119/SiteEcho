import express from 'express';

import {
  deletePhotos,
  getUserPhotos,
  syncPhotos,
  updatePhoto,
  deletePhotoById,
  batchUpdatePhotos,
  cleanupExpiredTrash,
  softDeleteBatch,
  restoreBatch,
} from '@/controllers/photo';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.post('/sync', requireUserId, syncPhotos);
router.post('/update-batch', requireUserId, batchUpdatePhotos);
router.post('/delete-batch', requireUserId, deletePhotos);
router.post('/cleanup-expired-trash', requireUserId, cleanupExpiredTrash);
router.post('/soft-delete-batch', requireUserId, softDeleteBatch);
router.post('/restore-batch', requireUserId, restoreBatch);
router.get('/', requireUserId, getUserPhotos);
router.patch('/:id', requireUserId, updatePhoto);
router.delete('/:id', requireUserId, deletePhotoById);

export default router;
