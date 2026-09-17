import express from 'express';

import { login, logout, refresh, ssoCallback, ssoLogin } from '@/controllers/auth';
import { validateAuth } from '@/middleware/validateAuth';

const router = express.Router();

router.post('/login', validateAuth, login);
router.post('/logout', logout);
router.post('/token/refresh', refresh);
// SSO 路由
router.post('/sso/:provider', ssoLogin);
router.post('/sso/:provider/callback', ssoCallback);

export default router;
