# SiteEcho MVP 驗證計畫

## 我們已經不需要再主要驗證

-   工地不適合大量打字
-   Voice 適合現場 Capture
-   工程現場存在大量 follow-up
-   Issue 會散落
-   Trade 是自然分類
-   Open Items 有管理價值

這些已有相當市場與從業者行為證據。

## MVP 真正要驗證

### Hypothesis A

使用者願意把現場事情告訴 SiteEcho。

### Hypothesis B

後續進展發生時，使用者願意再次更新同一個 Issue。

### Hypothesis C

SiteEcho 主動提醒 stale Issue，真的會觸發工作行動。

### Hypothesis D

使用者開始依賴 SiteEcho 管理「還沒下文的事情」。

### Hypothesis E

這種依賴足以形成付費意願。

## 核心 Metrics

``` text
Issues Created
Issues With 2+ Events
Issues Resolved
Stale Issues Reminded
Reminder → Update
Reminder → Resolution
Recovered Open Loops
```

## 最重要的三個比例

### Update Rate

``` text
Issues with 2+ Events / Issues Created
```

驗證 Continuity。

### Resolution Rate

``` text
Resolved Issues / Issues Created
```

驗證是否真的形成閉環。

### Recovery Rate

``` text
Reminder-triggered Action / Reminders
```

驗證 SiteEcho 是否真的避免事情掉下去。

## 兩週 Dogfood / Pilot

建議： - 自己先使用 - 5--10 位真實現場從業者 - 免費 - 約 2 週

不要一開始追 DAU、session time。

## 訪談問題

1.  這兩週有沒有哪件事情，是 SiteEcho 提醒後你才想到還沒處理？
2.  哪一次 AI 幫你接回舊 Issue 讓你覺得有價值？
3.  哪些事情你還是選擇丟 LINE 群組／Notes，而沒有告訴 SiteEcho？
4.  為什麼？
5.  如果 SiteEcho 明天消失，你會回到什麼方法？
6.  你最捨不得失去的是哪一個功能？
7.  你願不願意為「未完成事項有人幫你盯」付費？為什麼？

## Go Signal

強訊號不是：

> 「很酷。」

而是：

> 「它真的提醒到一件我差點忘記的事。」

更強：

> 「如果沒有它，我又要自己追。」

## Kill Signal

若大量 Issue： - 只有第一次 Capture - 幾乎沒有第二次 Update - Reminder
被忽略 - 使用者仍主要回到 Notes / 自傳 LINE - 使用者認為搜尋 LINE 已足夠

則不要靠增加功能硬救 Continuity 假設。
