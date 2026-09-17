# SiteEcho Data Model

## 核心模型

``` text
User
└─ Project
   └─ Trade
      └─ Issue
         └─ Event
```

Voice 不是資料層，只是建立 Event 的輸入方式。

## User

建議欄位：

``` text
id
line_user_id
created_at
active_project_id
```

V0 可直接使用 LINE User ID 作為 identity。

## Project

``` text
id
user_id
name
status
created_at
updated_at
```

status： - ACTIVE - ARCHIVED

## Trade

``` text
id
project_id
name
normalized_type
created_at
```

範例： - 水電 - 木作 - 泥作 - 油漆 - 空調 - 鋁窗 - 系統櫃 - 其他

normalized_type 用於未來統計與 AI normalization。

## Issue

``` text
id
project_id
trade_id
title
status
current_summary
waiting_for
created_at
updated_at
resolved_at
last_activity_at
```

V0 status 優先保持簡單：

-   OPEN
-   RESOLVED

`waiting_for` 可保留自然語意： - 待業主確認 - 待水電修改 - 待設計師回覆

避免過早建立複雜狀態機。

## Event

``` text
id
issue_id
source_type
raw_text
summary
event_type
created_at
```

source_type： - VOICE - TEXT - SYSTEM_REMINDER

event_type 初期可包含： - OBSERVATION - UPDATE - DECISION - ACTION -
RESOLUTION

不必要求 AI 每次都完美分類。

## Example

``` text
Project: 內湖案
Trade: 水電
Issue: 主臥插座位置

Event 1
OBSERVATION
發現插座位置不對，暫停施工。

Event 2
DECISION
設計師確認向左移 10 cm。

Event 3
RESOLUTION
水電完成修改。

Issue.status = RESOLVED
```

## 資料模型原則

1.  Project 是強 Context，由 UX 決定。
2.  Trade 是重要工作維度，但 Capture 不強迫選擇。
3.  Issue 是核心 Object。
4.  Event 保存「事情怎麼演進」。
5.  Resolution 是 Issue 生命周期終點。
6.  未來 SiteNear / SiteEcho 若有整合需求，此模型應保持可擴展性。
