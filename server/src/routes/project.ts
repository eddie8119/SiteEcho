import express from 'express';

import {
  createProject,
  deleteProject,
  deleteProjectsBatch,
  getOverviewProjects,
  getProject,
  getProjects,
  syncProjects,
  updateProject,
} from '@/controllers/project';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.get('/overview', requireUserId, getOverviewProjects);
router.post('/sync', requireUserId, syncProjects);
router.post('/delete-batch', requireUserId, deleteProjectsBatch);
router.get('/', requireUserId, getProjects);
router.get('/:id', requireUserId, getProject);
router.post('/', requireUserId, createProject);
router.patch('/:id', requireUserId, updateProject);
router.delete('/:id', requireUserId, deleteProject);

export default router;
