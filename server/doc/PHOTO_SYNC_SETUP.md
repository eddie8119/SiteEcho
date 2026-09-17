# Photo Sync 功能設置

登入/註冊成功後，前端會自動將 IndexedDB 中尚未同步的照片上傳到 Supabase。

## 1. 資料表與 Storage Bucket

執行 migration：

```bash
# 透過 Supabase CLI
supabase db push
```

或手動在 Supabase SQL Editor 執行：

`server/supabase/migrations/20260419000000_create_photos_table.sql`

此 migration 會建立：

- **Table `Photos`**：照片 metadata（含 `client_id` 用於冪等上傳）
- **Storage bucket `photos`**：儲存照片檔案（private）
- **RLS Policies**：用戶僅能讀寫自己 `user_id` 下的照片與檔案

## 2. 環境變數

後端 (`server/.env`) 需確保以下變數正確：

```
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

前端 (`.env`) 需：

```
VITE_API_URL=http://localhost:3000/api
```

## 3. API

### `POST /api/photos/sync`

批次上傳照片。Request body：

```json
{
  "photos": [
    {
      "client_id": "uuid",
      "project_id": "uuid|null",
      "taken_at": "ISO datetime",
      "construction": "string|null",
      "space": "string|null",
      "status": "normal|pending",
      "pending_type": "none|discuss|modify|null",
      "note": "string",
      "file_base64": "純 base64（不含 data: 前綴）",
      "mime_type": "image/jpeg"
    }
  ]
}
```

Response：

```json
{
  "success": true,
  "data": {
    "total": 5,
    "synced": 5,
    "failed": 0,
    "results": [{ "client_id": "...", "success": true, "id": "..." }]
  }
}
```

### `GET /api/photos`

回傳當前用戶的所有照片（含 1 小時的 signed URL）。

## 4. 前端流程

1. 用戶未登入時，拍照儲存到 IndexedDB（`synced: false`）
2. 登入成功 → `useAuthStore.isAuthenticated` 變為 `true`
3. `useRegistrationFlow` 中的 `watch` 自動觸發 `syncPhotos()`
4. 讀取所有 `synced: false` 的照片，每 5 張一批上傳
5. 每張成功上傳後，更新本地 `synced: true`
6. Header 顯示進度：`同步中 3/12` → `✅ 已備份到雲端`

## 5. 冪等性

`Photos` 表的 `UNIQUE (user_id, client_id)` 約束搭配後端先查詢既有紀錄的邏輯，
確保重複呼叫 `/sync` 不會產生重複資料。
