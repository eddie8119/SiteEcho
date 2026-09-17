# SiteEcho MVP 技術架構

## 高階架構

``` text
LINE User
   ↓
LINE Official Account
   ↓ Webhook
Backend API
   ├─ Audio Fetch
   ├─ STT
   ├─ AI Structuring
   ├─ Issue Retrieval / Matching
   ├─ Business Logic
   └─ LINE Reply
   ↓
Database
```

## LINE Layer

使用： - LINE Official Account - Messaging API - Webhook - Voice / Text
message handling - Reply Message - Postback - Rich Menu

未來需要較複雜 UI 時，再考慮 LIFF。

## Voice Processing

``` text
message_id
↓
LINE Content API
↓
temporary audio
↓
STT
↓
transcript
↓
delete temporary audio
```

原則：

> Audio is input, not archive.

## Backend

建議責任：

-   webhook verification
-   user identification
-   active project
-   project CRUD
-   trade normalization
-   issue CRUD
-   event append
-   stale detection
-   reminder scheduler
-   AI orchestration
-   LINE response rendering

## Database

V0 至少：

``` text
users
projects
trades
issues
events
```

Embedding 可： - 放向量資料庫 - 或使用支援 vector 的既有 DB

MVP 不需要複雜 Knowledge Base。

## AI

V0 只需要：

1.  STT
2.  Structured extraction
3.  Trade classification
4.  Existing Issue matching
5.  Resolution detection

不需要： - Fine-tuning - Agent framework - RAG knowledge base - Image
model - Long-term autonomous agent

## Storage

主要永久資料：

-   transcript（可選）
-   event summary
-   issue summary
-   timestamps
-   trade
-   status
-   embeddings

不永久保存原始語音，可大幅降低 storage 與 privacy burden。

## Future Surface

``` text
Same Backend
├─ LINE
├─ LIFF / Web
└─ Native App
```

各 Surface 可以有不同 Flow，不要求 UI parity。
