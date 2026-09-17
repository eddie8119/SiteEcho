import { Request, Response } from 'express';

/**
 * 從 req 取得 userId，若未授權則自動回應 401
 * @returns userId 或 undefined（已回應 401）
 */
export function getUserIdOrUnauthorized(req: Request, res: Response): string | undefined {
  const userId = req.user?.id;
  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
    });
    return undefined;
  }
  return userId;
}
