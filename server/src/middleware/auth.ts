import { NextFunction, Request, Response } from 'express';

import { createClientWithToken, supabaseAdmin } from '@/lib/supabase';
import { getUserIdOrUnauthorized } from '@/utils/auth';

// 定義用戶接口
interface User {
  id: string;
  email: string;
  name?: string;
}

// 擴展 Express 的 Request 類型
declare module 'express' {
  interface Request {
    user?: User;
    userId?: string;
    supabase?: ReturnType<typeof createClientWithToken>;
  }
}

/**
 * 驗證用戶身份並將用戶信息附加到 request 對象上
 */
export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // 從請求頭中獲取 token
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided',
      });
    }

    // 使用 admin client 驗證 token 並獲取用戶信息
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token',
      });
    }

    const { user } = data;
    // 驗證完 JWT（或 session），就會把解析出來的用戶資訊 將用戶信息附加到 request 對象上
    // 一次驗證，全程可用
    req.user = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name,
    };

    // 為當前請求創建帶有用戶 token 的 client，確保 RLS 正確執行
    req.supabase = createClientWithToken(token);

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({
      success: false,
      message: 'Authentication failed',
      error: errorMessage,
    });
  }
};

export function requireUserId(req: Request, res: Response, next: NextFunction) {
  const userId = getUserIdOrUnauthorized(req, res);
  if (!userId) return; // 已經回應 401
  // 可以掛到 req 上，讓後續 handler 直接用
  req.userId = userId;
  next();
}

/**
 * 可選認證中間件：有 token 時驗證並附加用戶資訊，沒有時繼續執行
 */
export const optionalAuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      // 沒有 token，直接繼續（不附加用戶資訊）
      return next();
    }

    // 使用 admin client 驗證 token
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      // token 無效，但不阻擋請求，繼續執行
      return next();
    }

    const { user } = data;
    req.user = {
      id: user.id,
      email: user.email!,
      name: user.user_metadata?.name,
    };

    // 為當前請求創建帶有用戶 token 的 client
    req.supabase = createClientWithToken(token);

    next();
  } catch {
    // 認證失敗也不阻擋，繼續執行
    next();
  }
};
