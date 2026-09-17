# 快速參考 - 郵件和速率限制

## 新增文件

```
server/src/utils/
├── rateLimiter.ts          # 速率限制器
├── emailHelper.ts          # 郵件 helper
└── controllerExamples.ts   # 使用示例
```

## 核心 API

### 速率限制

```typescript
import { isRateLimited, getRemainingAttempts, getResetTimeInSeconds } from '@/utils/rateLimiter';

// 檢查是否超過限制
if (isRateLimited('key', 5, 60 * 60 * 1000)) {
  // 超過限制
}

// 獲取剩餘嘗試次數
const remaining = getRemainingAttempts('key', 5, 60 * 60 * 1000);

// 獲取重置時間（秒）
const resetTime = getResetTimeInSeconds('key', 60 * 60 * 1000);
```

### 郵件操作

```typescript
import {
  checkEmailRateLimit,
  sendActivationEmailSafely,
  sendPasswordResetEmailSafely,
  EmailOperationType,
} from '@/utils/emailHelper';

// 檢查速率限制
const check = checkEmailRateLimit(email, EmailOperationType.ACTIVATION);
if (check.limited) {
  return res.status(429).json({
    success: false,
    message: check.message,
    retryAfter: check.resetTimeSeconds,
  });
}

// 發送激活郵件（失敗不刪除用戶）
const result = await sendActivationEmailSafely(email, token, name);
if (!result.success) {
  console.log(result.message);
}

// 發送密碼重置郵件
const result = await sendPasswordResetEmailSafely(email, token);
```

## 集成檢查清單

- [ ] 在 `register()` 中添加速率限制檢查
- [ ] 在 `register()` 中使用 `sendActivationEmailSafely()`
- [ ] 在 `forgotPassword()` 中添加速率限制檢查
- [ ] 在 `forgotPassword()` 中使用 `sendPasswordResetEmailSafely()`
- [ ] 在 `resendActivation()` 中添加速率限制檢查
- [ ] 在 `resendActivation()` 中使用 `sendActivationEmailSafely()`
- [ ] 測試速率限制功能
- [ ] 測試郵件失敗場景
- [ ] 更新前端錯誤處理

## 常見場景

### 場景 1: 用戶註冊

```
1. 檢查速率限制 → 超過 → 返回 429
2. 創建 auth user 和 profile
3. 發送激活郵件
   - 成功 → 返回 201，用戶已激活
   - 失敗 → 返回 201，用戶已創建，提示重新發送
```

### 場景 2: 忘記密碼

```
1. 檢查速率限制 → 超過 → 返回 429
2. 檢查用戶是否存在 → 不存在 → 返回 200（防止枚舉）
3. 生成重置 token
4. 發送郵件
   - 成功/失敗 → 都返回 200（防止枚舉）
```

### 場景 3: 重新發送激活

```
1. 檢查速率限制 → 超過 → 返回 429
2. 檢查用戶是否存在 → 不存在 → 返回 200（防止枚舉）
3. 生成激活 token
4. 發送郵件
   - 成功/失敗 → 都返回 200（防止枚舉）
```

## 速率限制預設值

| 操作 | 限制 | 窗口 |
|------|------|------|
| 激活郵件 | 5 次 | 1 小時 |
| 密碼重置 | 5 次 | 1 小時 |
| 重新發送 | 3 次 | 1 小時 |

## 測試命令

```bash
# 測試速率限制
curl -X POST http://localhost:3000/user/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 快速發送多次請求（測試 429）
for i in {1..6}; do
  curl -X POST http://localhost:3000/user/forgot-password \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com"}'
  sleep 1
done
```

## 詳細文檔

見 `INTEGRATION_GUIDE.md`
