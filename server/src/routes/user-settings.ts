import express from 'express';

import { getUserSettings, updateUserSettings } from '@/controllers/userSettings';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

router.use(authMiddleware);

router.get('/', requireUserId, getUserSettings);
router.put('/', requireUserId, updateUserSettings);

export default router;
