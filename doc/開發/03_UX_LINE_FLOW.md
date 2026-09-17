# SiteEcho LINE-native UX Flow

## UX 原則

SiteEcho 沒有傳統首頁。

> **使用者打開 LINE 與 SiteEcho 的對話，就是首頁。**

不要把 App navigation 搬進 LINE。

## 1. First-time Onboarding

SiteEcho：

> 👋 我是 SiteEcho。\
> 工地上的事情不用慢慢打字，直接說給我。\
> 我會幫你記住事情，也記住後來怎麼了。
>
> 先建立第一個工地。\
> \[＋ 建立工地\]

使用者輸入：

> 內湖案

SiteEcho：

> ✓ 已建立 **內湖案**
>
> 📍 目前：內湖案\
> 現場有事情，直接傳語音給我 🎙️

Onboarding 到此結束。

不要求： - Email 註冊 - 公司資料 - 職業 - 工程類型 - 完整 Profile

## 2. Ready State

核心狀態：

``` text
📍 目前：內湖案

工地有什麼事情，
直接用語音告訴我 🎙️
```

## 3. 第一次 Capture

使用者：

> 🎙️「主臥插座位置不對，先叫水電不要收，我再問設計師。」

AI 產生：

``` text
Project: 內湖案
Trade: 水電
Issue: 主臥・插座位置
Status: Waiting
Event: 發現位置問題，水電暫緩施工，待設計師確認。
```

LINE 回覆：

> ✓ **幫你記下來了**
>
> 🟠 **水電｜主臥・插座位置**\
> 水電暫緩施工\
> 等待設計師確認
>
> \[有誤\]

## 4. Existing Issue Update

兩天後：

> 🎙️「主臥那個插座，設計師說往左十公分。」

AI 找到候選 Existing Issue。

LINE：

> ↻ **接續到之前的事情**
>
> 🟠 水電｜主臥・插座位置
>
> 9/17 發現位置問題\
> ↓\
> 今天 設計師確認向左 10 cm
>
> 現在：**待水電修改**
>
> \[不是這件\]

## 5. Resolution

使用者：

> 🎙️「主臥插座好了。」

LINE：

> ✓ **這件事完成了**
>
> 水電｜主臥・插座位置
>
> 9/17 發現問題\
> 9/19 確認位置\
> 9/21 完成修改
>
> **3 次紀錄 · 已結案**

## 6. Open Issues

Rich Menu：

> 🟠 待處理 6

點擊後：

> **內湖案 · 還有 6 件沒結束**
>
> **水電 3**\
> · 主臥插座位置 --- 待修改\
> · 廚房迴路 --- 待確認\
> · 客浴插座 --- 待業主
>
> **木作 2**\
> · 天花收邊 --- 待修改\
> · 衣櫃尺寸 --- 待確認
>
> **泥作 1**\
> · 浴室磁磚 --- 待處理

V0 不需要一次展示大量資料。

## 7. Project Switching

Rich Menu：

> 📍 內湖案

點擊：

``` text
目前工地：
✓ 內湖案
  信義案
  民生案

[＋ 新增工地]
```

選擇後更新 backend active_project_id。

## 8. Rich Menu

V0 僅保留三個核心入口：

``` text
📍 內湖案   |   🟠 待處理 6   |   🎙️ 直接說
```

避免：

首頁 / AI / 報告 / 行事曆 / 我的 / 設定 / 更多

## 9. Trade UX

V0 不增加 Capture 前強制選工種。

預設：

`Project → Voice → AI Trade Classification`

若 AI 不確定：

> 工種可能是：**水電**
>
> \[水電\] \[木作\] \[其他\]

未來若觀察到使用者常以「巡某一工種」方式工作，再加入：

> 🔧 目前工種：水電

形成 Active Trade Mode。

## 10. LINE Constitution

核心操作原則：

> **一段語音 + 最多一次確認／修正。**

若一個功能需要多層 Navigation、四個欄位與 Submit，它就不應該存在於 LINE
MVP。
