# SiteEcho MVP 功能範圍

## MVP 目標

驗證：

> 工程從業者是否願意透過 LINE 持續把現場事情告訴
> SiteEcho，並在後續進展發生時更新同一個 Issue。

不是驗證語音辨識技術本身。

## V0 必做

### Project

-   建立 Project
-   切換目前 Project
-   每次 Capture 自動帶入 active_project_id
-   Recording / Ready State 永遠存在明確的目前專案

### Trade

-   資料模型第一天就存在 Trade
-   AI 優先自動分類
-   使用者可修正
-   V0 不強迫 Capture 前先選 Trade
-   保留未來 Active Trade Mode 的可能

### Capture

-   LINE Voice
-   LINE Text
-   語音轉文字
-   AI 結構化

### Issue

-   建立新 Issue
-   AI Matching 到 Existing Issue
-   Open
-   Resolved
-   Issue Timeline

### Follow-up

-   stale issue detection
-   主動提醒
-   提醒後可直接用 Voice 更新
-   完成後 Resolved

### Correction

-   AI 判錯可 Undo
-   Trade 判錯可修改
-   Issue Match 判錯可選「不是這件」
-   必要時建立新 Issue

## V0 不做

-   Daily Report
-   PDF 報表
-   RFI
-   完整 Punch List 系統
-   Due Date
-   Priority
-   Subtask
-   Calendar
-   Recurring Task
-   複雜 Assignee
-   Team Permission
-   長時間會議錄音
-   電話自動監聽
-   圖片 AI
-   Drawing
-   Gantt
-   Billing / Estimation
-   Procore / Fieldwire integration
-   AI 工程判斷
-   RAG / Agent
-   原生 App

## MVP 原則

### 1. 一段語音 + 最多一次修正

任何核心操作都應盡可能在：

`Voice → AI → Done`

完成。

### 2. Optimistic Save

AI 高信心時直接保存。

不要每次都要求：

`是否確認？ Yes / No`

只有低信心或可能造成重大錯誤時才要求確認。

### 3. Context 能由 UX 提供，就不要讓 AI 猜

Project 由使用者明確選定。

Trade 可由 AI 判斷。

Issue Match 由 AI 提議並允許使用者修正。

### 4. Audio is input, not archive

語音完成 STT 與結構化後，預設不永久保存原始音檔。
