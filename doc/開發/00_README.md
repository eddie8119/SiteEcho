# SiteEcho MVP 開發文檔

版本：V0.1\
階段：LINE-first MVP / 初步定案\
市場：台灣工程／裝修現場\
產品形態：LINE-native 工地語音助理

## 核心命題

SiteEcho 不賣「語音轉文字」，也不以「工程日報」為核心。

SiteEcho 要解決的是：

> **工地上講過的事情，不要因為沒有人繼續追而消失。**

核心流程：

**Voice → Open Loop → Follow-up → Resolution**

歷史脈絡（Issue History）不是單純的整理功能，而是 Open Loop
在被持續追蹤、更新、結案後自然形成的工作紀錄。

## 第一階段產品策略

-   LINE 是第一個正式產品形態，不是 App 的縮水版。
-   利用台灣工程從業者高度依賴 LINE 的既有行為，降低導入成本。
-   不要求使用者先下載新 App、建立複雜帳號或學習新的工程管理系統。
-   LINE 負責 Capture / Update / Reminder。
-   未來 LIFF / Web / App 承接 Browse / Search / Organize / Report
    等較複雜操作。
-   不強迫 LINE 與未來 App 共用完全相同的 UX Flow。
-   底層資料模型保持相容：Project → Trade → Issue → Event → Resolution。

## 文檔索引

1.  `01_PRODUCT_STRATEGY.md` --- 產品定位、價值、競爭策略與商業假設
2.  `02_PRODUCT_SCOPE_MVP.md` --- MVP 功能範圍、Do / Don't Build
3.  `03_UX_LINE_FLOW.md` --- LINE-native UX、完整 Conversation Flow
4.  `04_DATA_MODEL.md` --- Project / Trade / Issue / Event 資料模型
5.  `05_AI_BEHAVIOR.md` --- 語音理解、工種分類、Issue
    Matching、信心與修正機制
6.  `06_REMINDER_OPEN_LOOP.md` --- Open Loop、提醒、結案與留存機制
7.  `07_TECH_ARCHITECTURE.md` --- LINE
    Webhook、STT、LLM、Backend、Storage 架構
8.  `08_VALIDATION_METRICS.md` --- MVP 驗證方法與 Go / No-Go 指標
9.  `09_MONETIZATION.md` --- 商業價值、付費假設與未來 Output
10. `10_FUTURE_APP_STRATEGY.md` --- LINE → LIFF/Web → App 的演化策略

## MVP 北極星

不是「使用者錄了多少語音」。

而是：

> **SiteEcho
> 是否成功讓原本可能失聯的事情，被再次更新、採取行動並最終結案。**

核心觀察指標：**Recovered Open Loop**。
