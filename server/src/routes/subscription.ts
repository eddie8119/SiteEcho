import express from 'express';

import {
  consumeUsage,
  getProjectSubscriptionInfo,
  getSubscriptionLimits,
  getUserSubscriptionInfo,
  getUserUsage,
} from '@/controllers/subscription';
import { authMiddleware, optionalAuthMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

// /info 使用可選認證，未登入用戶返回預設 trial 狀態
router.get('/info', optionalAuthMiddleware, getUserSubscriptionInfo);

// 其他路由需要登入
router.get('/limits', authMiddleware, requireUserId, getSubscriptionLimits);
router.get('/project-info', authMiddleware, requireUserId, getProjectSubscriptionInfo);
router.get('/usage', authMiddleware, requireUserId, getUserUsage);
router.post('/usage/consume', authMiddleware, requireUserId, consumeUsage);

export default router;
