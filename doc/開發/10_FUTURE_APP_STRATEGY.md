# SiteEcho LINE → App 演化策略

## 核心原則

不是：

> LINE 試用版 → 強迫下載 App。

而是：

> LINE 永遠可以 Capture；當使用深度自然超過聊天介面能力時，App / Web
> 才提供額外價值。

## Phase 1 --- LINE

角色：

**Capture + Update + Nudge**

適合： - Voice - Text - 建立 Issue - 更新 Issue - 切換 Project - Open
Issue Summary - Reminder - Resolve

## Phase 2 --- LINE + LIFF / Web

當使用者開始有：

-   多 Project
-   大量 Open Issues
-   長 Timeline
-   搜尋需求
-   批次整理需求

LINE 提供：

> \[查看全部\]

進入 LIFF / Web。

角色：

**Review + Organize**

## Phase 3 --- Native App

只有市場證明需要時才做。

可能理由：

-   更快的 Project / Trade navigation
-   大量 Timeline
-   強搜尋
-   Offline
-   Photo-heavy workflow
-   更完整現場操作
-   多人協作
-   Push / background capabilities

## 不要求 Feature Parity

LINE Flow：

> 說 → AI → 更新 → 提醒

App Flow：

> Browse → Filter → Search → Review → Organize

兩者共享 Backend 與 Data Model，但不共享完全相同的 UX。

## 「養套」策略的健康版本

要養成的是：

> **有事情 → 告訴 SiteEcho**

而不是：

> **先把資料鎖在 LINE，再逼使用者下載 App。**

App 的下載理由必須由使用者自然產生：

> 「我的事情已經很多，我需要更好的整理與查看方式。」

這時 App 才是升級，而不是遷移成本。

## 長期產品家族

可保持：

``` text
SiteEcho
├─ LINE — field capture
├─ Web / LIFF — review
└─ App — power workflow
```

底層共同：

``` text
Project → Trade → Issue → Event → Resolution
```

產品介面則依載體特性各自設計。
