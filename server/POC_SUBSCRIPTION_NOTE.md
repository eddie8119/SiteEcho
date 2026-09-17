# 訂閱系統簡化方案

## 背景

為了簡化訂閱邏輯，產品採用簡化的訂閱模式，只有 **Freemium（免費）** 和 **Paid（付費）** 兩種會員類型，沒有試用期（trial）模式。

**重要變更（2025-05-18）**：
- 移除所有試用期（trial）相關欄位和邏輯
- 簡化 plan 欄位，只有 'free' 和 'paid' 兩種值
- 移除多層級付費方案（starter, professional, enterprise），統一為單一付費方案

## 資料庫結構

### Profiles 表

**檔案**: `server/supabase/migrations/20260425000000_create_profiles_table.sql`

欄位：
- `is_paid` (BOOLEAN) - 付費狀態標記
- `stripe_customer_id` (TEXT) - Stripe 客戶 ID

**邏輯**：
- `is_paid = true` → 用戶為付費會員
- `is_paid = false` → 用戶為免費會員

### UserSubscriptions 表

**檔案**: `server/supabase/migrations/20260425000001_create_user_subscriptions_table.sql`

**重要變更（2025-05-18）**：移除試用期欄位

移除的欄位：
- `trial_start`
- `trial_end_scheduled`
- `trial_end`

保留的欄位：
- `plan` (TEXT) - 訂閱方案，值為 'free' 或 'paid'
- `status` (TEXT) - 訂閱狀態（active, inactive, cancelled, past_due）
- `stripe_subscription_id` (TEXT) - Stripe 訂閱 ID
- `current_period_start` / `current_period_end` - 計費週期
- `cancel_at_period_end` (BOOLEAN) - 是否在週期結束時取消

**約束**：
```sql
CHECK (plan IN ('free', 'paid'))
```

### SubscriptionInvoices 表

**檔案**: `server/supabase/migrations/20260425000002_create_subscription_invoices_table.sql`

用於追蹤發票記錄，欄位保持不變。

## 後端邏輯

### Subscription Controller

**檔案**: `server/src/controllers/subscription.ts`

**變更（2025-05-18）**：
- 移除 API 回應中的 `isTrialExpired` 欄位
- 簡化為只返回 `subscriptionType` ('paid' | 'freemium') 和 `limits`

**邏輯規則**：
```typescript
const isPaid = profile?.is_paid || false;
const isDeveloper = profile?.is_developer || false;
const isSubscribed = isPaid || isDeveloper;

if (isSubscribed) {
  return { subscriptionType: 'paid', limits: SUBSCRIPTION_LIMITS.paid };
} else {
  return { subscriptionType: 'freemium', limits: SUBSCRIPTION_LIMITS.freemium };
}
```

### Billing Controller

**檔案**: `server/src/controllers/billing.ts`

**變更（2025-05-18）**：
- 移除 `mapSubscriptionStatus` 中的 'trialing' 狀態處理
- 移除 `upsertSubscriptionRecord` 中的 `trial_end` 欄位處理
- 簡化 `planPriceMap` 為單一付費方案：
  ```typescript
  const planPriceMap: Record<string, string | undefined> = {
    paid: process.env.STRIPE_PRICE_ID_PAID,
  };
  ```

### Subscription Config

**檔案**: `server/src/config/subscriptionConfig.ts`

**變更（2025-05-18）**：
- 移除 `PAID_PLAN_LIMITS`（多層級付費方案配置）
- 保留基礎的 `SUBSCRIPTION_LIMITS`（freemium, paid, developer）

## 資料庫 Migration

### 移除試用期欄位

**檔案**: `server/supabase/migrations/20260518000000_remove_trial_fields_and_simplify_plan.sql`

此 migration 執行以下操作：
1. 移除 `UserSubscriptions` 表的試用期欄位：`trial_start`, `trial_end_scheduled`, `trial_end`
2. 將現有 'trial' 方案更新為 'free'
3. 設定 plan 欄位預設值為 'free'
4. 新增約束確保 plan 只能是 'free' 或 'paid'
5. 根據 `Profiles.is_paid` 狀態同步更新 `UserSubscriptions` 的 plan 和 status

## Stripe 整合

### 環境變數

需要配置以下環境變數：
- `STRIPE_BILLING_ENABLED=true` - 啟用 Stripe 付費功能
- `STRIPE_PRICE_ID_PAID` - 單一付費方案的 Price ID
- `STRIPE_WEBHOOK_SECRET` - Webhook 簽名驗證密鑰

### Webhook 事件

處理以下 Stripe webhook 事件：
- `checkout.session.completed` - 結帳完成
- `customer.subscription.created` - 訂閱建立
- `customer.subscription.updated` - 訂閱更新
- `customer.subscription.deleted` - 訂閱刪除
- `invoice.paid` - 發票已付款
- `invoice.payment_failed` - 發票付款失敗
- `invoice.finalized` - 發票最終確定

## 前端相容性

### API 返回格式

```typescript
{
  success: true,
  data: {
    subscription: null,
    subscriptionType: 'paid' | 'freemium',
    limits: {
      maxMembers: number,
      storageLimitBytes: number,
      usedStorageBytes: number,
      photoCount: number,
    },
  }
}
```

## 相關檔案清單

### 資庫 Migrations
- `server/supabase/migrations/20260425000000_create_profiles_table.sql` - Profiles 表
- `server/supabase/migrations/20260425000001_create_user_subscriptions_table.sql` - UserSubscriptions 表
- `server/supabase/migrations/20260425000002_create_subscription_invoices_table.sql` - SubscriptionInvoices 表
- `server/supabase/migrations/20260518000000_remove_trial_fields_and_simplify_plan.sql` - **移除試用期欄位**

### 後端 Controllers
- `server/src/controllers/subscription.ts` - 訂閱資訊查詢（已移除 isTrialExpired）
- `server/src/controllers/billing.ts` - Stripe 結帳和 webhook 處理（已移除 trial 邏輯）

### 後端 Config
- `server/src/config/subscriptionConfig.ts` - 訂閱限制配置（已移除 PAID_PLAN_LIMITS）

### 後端 Routes
- `server/src/routes/subscription.ts` - 訂閱路由
- `server/src/routes/billing.ts` - 付費路由

## 注意事項

1. **單一付費方案**：產品只有付費會員與非付費會員兩種狀態，無多層級方案
2. **無試用期**：已完全移除試用期相關邏輯
3. **is_developer 保留**：開發者權限邏輯仍然有效，開發者視為付費會員
4. **資料同步**：`Profiles.is_paid` 和 `UserSubscriptions.plan` 應保持同步
