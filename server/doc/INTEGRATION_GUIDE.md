# 郵件失敗處理和速率限制集成指南

## 概述

本指南說明如何在 `user.ts` controller 中集成新的郵件 helper 和速率限制功能。

## 新增文件

### 1. `src/utils/rateLimiter.ts`
記憶體型速率限制器，用於限制敏感操作。

**主要函數：**
- `isRateLimited(key, maxAttempts, windowMs)` - 檢查是否超過限制
- `getRemainingAttempts(key, maxAttempts, windowMs)` - 獲取剩餘嘗試次數
- `getResetTimeInSeconds(key, windowMs)` - 獲取重置時間（秒）
- `resetRateLimit(key)` - 重置特定鍵的限制
- `cleanupExpiredLimits()` - 清理過期記錄（自動每小時執行）

**使用示例：**
```typescript
import { isRateLimited, getRemainingAttempts } from '@/utils/rateLimiter';

const key = 'password_reset:user@example.com';
if (isRateLimited(key, 5, 60 * 60 * 1000)) {
  // 超過限制
  const remaining = getRemainingAttempts(key, 5, 60 * 60 * 1000);
  console.log(`Remaining attempts: ${remaining}`);
}
```

### 2. `src/utils/emailHelper.ts`
郵件操作的 helper 函數，包含速率限制和失敗處理。

**主要函數：**
- `checkEmailRateLimit(email, operationType, maxAttempts, windowMs)` - 檢查郵件操作速率限制
- `sendActivationEmailSafely(email, token, name)` - 安全發送激活郵件（失敗不刪除用戶）
- `sendPasswordResetEmailSafely(email, token)` - 安全發送密碼重置郵件
- `sendRateLimitResponse(res, email, operationType, ...)` - 返回速率限制響應
- `sendEmailFailureResponse(res, statusCode, result)` - 返回郵件失敗響應

**操作類型：**
```typescript
enum EmailOperationType {
  ACTIVATION = 'activation',
  PASSWORD_RESET = 'password_reset',
}
```

## 集成步驟

### 步驟 1: 更新 `register()` 函數

```typescript
import { sendActivationEmailSafely, EmailOperationType, checkEmailRateLimit } from '@/utils/emailHelper';

export const register = async (req: Request, res: Response) => {
  try {
    // ... 驗證和創建用戶的代碼 ...

    // 檢查速率限制
    const rateLimitCheck = checkEmailRateLimit(email, EmailOperationType.ACTIVATION);
    if (rateLimitCheck.limited) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        retryAfter: rateLimitCheck.resetTimeSeconds,
      });
    }

    // 發送激活郵件（安全版本）
    const emailResult = await sendActivationEmailSafely(email, token, name);

    if (!emailResult.success && emailResult.shouldRollback) {
      await rollbackUserRegistration(authData.user.id);
      return res.status(500).json({
        success: false,
        message: emailResult.message,
      });
    }

    // 即使郵件失敗，也返回 201（用戶已創建）
    res.status(201).json({
      success: emailResult.success,
      data: { user, userDoc },
      message: emailResult.message,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed due to an unexpected error.',
    });
  }
};
```

### 步驟 2: 更新 `forgotPassword()` 函數

```typescript
import { sendPasswordResetEmailSafely, EmailOperationType, checkEmailRateLimit } from '@/utils/emailHelper';

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // 檢查速率限制（5 次/小時）
    const rateLimitCheck = checkEmailRateLimit(
      email,
      EmailOperationType.PASSWORD_RESET,
      5,
      60 * 60 * 1000
    );
    if (rateLimitCheck.limited) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        retryAfter: rateLimitCheck.resetTimeSeconds,
      });
    }

    // ... 檢查用戶、生成 token 的代碼 ...

    // 發送郵件（安全版本）
    const emailResult = await sendPasswordResetEmailSafely(email, token);

    // 即使郵件失敗，也返回成功（防止郵箱枚舉）
    res.json({
      success: true,
      message: emailResult.message,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send password reset email',
    });
  }
};
```

### 步驟 3: 更新 `resendActivation()` 函數

```typescript
import { sendActivationEmailSafely, EmailOperationType, checkEmailRateLimit } from '@/utils/emailHelper';

export const resendActivation = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }

    // 檢查速率限制（3 次/小時）
    const rateLimitCheck = checkEmailRateLimit(
      email,
      EmailOperationType.ACTIVATION,
      3,
      60 * 60 * 1000
    );
    if (rateLimitCheck.limited) {
      return res.status(429).json({
        success: false,
        message: rateLimitCheck.message,
        retryAfter: rateLimitCheck.resetTimeSeconds,
      });
    }

    // ... 檢查用戶、生成 token 的代碼 ...

    // 發送郵件（安全版本）
    const emailResult = await sendActivationEmailSafely(email, token);

    // 即使郵件失敗，也返回成功
    res.json({
      success: true,
      message: emailResult.message,
    });
  } catch (error) {
    console.error('Resend activation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resend activation email',
    });
  }
};
```

## 速率限制配置

### 預設配置

| 操作 | 最大嘗試次數 | 時間窗口 |
|------|------------|--------|
| 激活郵件 | 5 次 | 1 小時 |
| 密碼重置 | 5 次 | 1 小時 |
| 重新發送激活 | 3 次 | 1 小時 |

### 自訂配置

```typescript
// 更嚴格的限制（2 次/30 分鐘）
const rateLimitCheck = checkEmailRateLimit(
  email,
  EmailOperationType.PASSWORD_RESET,
  2,
  30 * 60 * 1000
);
```

## HTTP 響應狀態碼

| 狀態碼 | 情況 |
|-------|------|
| 200 | 操作成功 |
| 201 | 資源創建成功 |
| 400 | 請求參數錯誤 |
| 429 | 超過速率限制 |
| 500 | 伺服器錯誤 |

## 郵件失敗處理策略

### 註冊流程
- **郵件成功** → 返回 201，用戶已創建
- **郵件失敗** → 返回 201，用戶已創建，提示重新發送激活郵件
- **其他錯誤** → 回滾用戶，返回 500

### 密碼重置流程
- **郵件成功** → 返回 200
- **郵件失敗** → 返回 200（防止郵箱枚舉攻擊）

### 重新發送激活流程
- **郵件成功** → 返回 200
- **郵件失敗** → 返回 200（防止郵箱枚舉攻擊）

## 客戶端處理

### 處理速率限制 (429)

```typescript
// 前端代碼示例
try {
  const response = await api.post('/user/forgot-password', { email });
} catch (error) {
  if (error.response?.status === 429) {
    const retryAfter = error.response.data.retryAfter;
    alert(`Please try again in ${retryAfter} seconds`);
  }
}
```

### 處理郵件失敗

```typescript
// 前端代碼示例
const response = await api.post('/user/register', userData);
if (response.data.success === false) {
  // 郵件失敗但用戶已創建
  alert('Registration successful, but email failed. Please check your email or request a new activation link.');
} else {
  // 完全成功
  alert('Registration successful. Please check your email to activate your account.');
}
```

## 監控和維護

### 清理過期限制

自動每小時執行一次 `cleanupExpiredLimits()`，清理過期的速率限制記錄。

### 手動重置限制

```typescript
import { resetRateLimit } from '@/utils/rateLimiter';

// 重置特定用戶的密碼重置限制
resetRateLimit('password_reset:user@example.com');
```

## 生產環境建議

1. **使用 Redis** - 將記憶體型限制器替換為 Redis，支持分佈式部署
2. **持久化存儲** - 考慮將郵件失敗日誌存儲到資料庫
3. **監控告警** - 監控高頻率的郵件失敗
4. **郵件隊列** - 使用消息隊列（如 Bull、RabbitMQ）處理郵件發送

## 示例代碼

詳見 `src/utils/controllerExamples.ts` 中的完整示例。
