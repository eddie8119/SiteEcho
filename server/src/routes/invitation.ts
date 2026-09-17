import express from 'express';

import {
  acceptInvitation,
  createProjectInvitation,
  getInvitationByToken,
} from '@/controllers/invitation';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

/**
 * POST /api/invitations/project/:projectId
 * Create a project invitation token
 * Guard: authenticated, project owner, Pro subscription, < 5 members
 */
router.post('/project/:projectId', authMiddleware, requireUserId, createProjectInvitation);

/**
 * GET /api/invitations/token/:token
 * Get invitation details by token (public)
 * Returns: inviter name, project name, status
 */
router.get('/token/:token', getInvitationByToken);

/**
 * POST /api/invitations/accept/:token
 * Accept an invitation (single-use, atomic)
 * Guard: authenticated
 */
router.post('/accept/:token', authMiddleware, requireUserId, acceptInvitation);

export default router;
