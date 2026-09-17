import express from 'express';

import {
  addGlobalCollaborator,
  addProjectCollaborator,
  getAllProjectCollaborators,
  getCollaboratorInfo,
  getGlobalCollaborators,
  getProjectCollaborators,
  removeGlobalCollaborator,
  removeProjectCollaborator,
  updateGlobalCollaborator,
  updateProjectCollaborator,
} from '@/controllers/collaborator';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

router.use(authMiddleware);

// Get collaborator info for authenticated user
router.get('/info', requireUserId, getCollaboratorInfo);

// Project-specific collaborator routes
router.get('/project/all', requireUserId, getAllProjectCollaborators);
router.get('/project/:projectId', requireUserId, getProjectCollaborators);
router.post('/project/:projectId', requireUserId, addProjectCollaborator);
router.patch('/project/:projectId/:collaboratorId', requireUserId, updateProjectCollaborator);
router.delete('/project/:projectId/:collaboratorId', requireUserId, removeProjectCollaborator);
// Global collaborator routes
router.get('/global', requireUserId, getGlobalCollaborators);
router.post('/global', requireUserId, addGlobalCollaborator);
router.patch('/global/:collaboratorId', requireUserId, updateGlobalCollaborator);
router.delete('/global/:collaboratorId', requireUserId, removeGlobalCollaborator);

export default router;
