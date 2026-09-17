/**
 * 簡單的記憶體速率限制器
 * 用於限制密碼重置、激活郵件等敏感操作
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * 檢查是否超過速率限制
 * @param key - 限制鍵（例如：email、user_id）
 * @param maxAttempts - 最大嘗試次數
 * @param windowMs - 時間窗口（毫秒）
 * @returns 是否超過限制
 */
export const isRateLimited = (
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000 // 預設 1 小時
): boolean => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    // 首次請求，建立新記錄
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // 檢查是否超過時間窗口
  if (now > entry.resetTime) {
    // 重置計數
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    });
    return false;
  }

  // 增加計數
  entry.count++;

  // 檢查是否超過限制
  return entry.count > maxAttempts;
};

/**
 * 獲取剩餘嘗試次數
 */
export const getRemainingAttempts = (
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60 * 60 * 1000
): number => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    return maxAttempts;
  }

  return Math.max(0, maxAttempts - entry.count);
};

/**
 * 獲取重置時間（秒）
 */
export const getResetTimeInSeconds = (key: string, windowMs: number = 60 * 60 * 1000): number => {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry) {
    return 0;
  }

  const remainingMs = Math.max(0, entry.resetTime - now);
  return Math.ceil(remainingMs / 1000);
};

/**
 * 重置特定鍵的限制
 */
export const resetRateLimit = (key: string): void => {
  rateLimitStore.delete(key);
};

/**
 * 清理過期的限制記錄（定期調用）
 */
export const cleanupExpiredLimits = (): void => {
  const now = Date.now();
  const keysToDelete: string[] = [];

  rateLimitStore.forEach((entry, key) => {
    if (now > entry.resetTime) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach((key) => rateLimitStore.delete(key));
};

/**
 * 定期清理過期記錄（每小時執行一次）
 */
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredLimits, 60 * 60 * 1000);
}
