# SiteEcho Open Loop & Reminder

## 核心價值

SiteEcho 不只是保存 Issue。

真正的價值：

> **把還沒有下文的事情留在使用者視野裡。**

## Open Loop 定義

Issue.status = OPEN 且尚未被明確 Resolved。

Open Issue 可以有自然語言狀態：

-   待業主確認
-   待水電修改
-   等設計師回覆
-   等材料
-   待現場確認

V0 不建立複雜 workflow state machine。

## Stale Issue

初始假設：

``` text
OPEN
AND
last_activity_at 超過 N 天
```

即成為 stale candidate。

N 不宜第一版過度精細化，可先使用固定值或簡單設定。

## Reminder Flow

SiteEcho：

> **內湖案有 2 件事情好幾天沒下文**
>
> 🟠 水電｜主臥插座\
> 待水電修改 · 5 天
>
> 🟠 木作｜衣櫃尺寸\
> 待設計師確認 · 6 天
>
> 有進度直接說給我就好 🎙️

使用者直接回 Voice。

AI Match 到 Existing Issue。

## Reminder 原則

-   不做高頻轟炸。
-   不把 SiteEcho 變成傳統 Todo reminder。
-   提醒的目的不是「到期」，而是「這件事情很久沒有後續」。
-   優先提醒真正 stale 的 Open Loop。
-   未來可依使用者行為調整頻率。

## Trade Summary

Open Issues 應可按 Trade 聚合：

``` text
內湖案 · 9 件未完成

水電 3
木作 2
泥作 4
```

這對應工程現場「哪個工種還欠哪些事情」的工作心智。

## Recovered Open Loop

定義：

> SiteEcho 主動提醒 stale Issue 後，使用者因此產生 Update / Action /
> Resolution。

這是 MVP 最重要的價值指標之一。

它比單純 Voice Capture 數更接近商業價值。
