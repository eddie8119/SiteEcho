import express from 'express';

import {
  activateAccount,
  changePassword,
  checkUserExists,
  deleteUser,
  forgotPassword,
  getCurrentUser,
  register,
  resendActivation,
  resetPassword,
  updateUser,
} from '@/controllers/user';
import { authMiddleware, requireUserId } from '@/middleware/auth';

const router = express.Router();

// 公開路由（不需要認證）
router.post('/register', register);
router.post('/activation', activateAccount); // 激活帳戶（驗證郵件）
router.post('/activation/resend', resendActivation); // 重新發送激活郵件
router.post('/reset-password', forgotPassword); // 要求重置密碼（發送郵件）
router.patch('/reset-password/confirm', resetPassword); // 確認重置密碼（使用 token）

// 需要認證的路由
router.use(authMiddleware);

// 個人資料
router.get('/profile', requireUserId, getCurrentUser);
router.put('/profile', requireUserId, updateUser);
router.delete('/me', requireUserId, deleteUser);
router.get('/check/:email', requireUserId, checkUserExists);

// 密碼管理
router.put('/change-password', requireUserId, changePassword); // 更改密碼（已登入）

export default router;
