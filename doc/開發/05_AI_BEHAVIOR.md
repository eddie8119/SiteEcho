# SiteEcho AI Behavior

## AI 的角色

AI 不負責做工程判斷。

AI 只負責降低整理成本：

> 使用者自然說話 → SiteEcho 幫忙結構化、找回上下文。

## Pipeline

``` text
LINE Voice
↓
取得 Audio
↓
Speech-to-Text
↓
Text Normalization
↓
Trade Classification
↓
Existing Issue Retrieval
↓
LLM Classification
↓
Create / Update Issue
↓
LINE Reply
```

## 1. Speech-to-Text

需要優先處理：

-   繁體中文
-   台灣口語
-   工程術語
-   中英混合料件名稱
-   未來可評估台語

原始 Audio 原則上處理完成後刪除。

## 2. Trade Classification

輸入：

> 「主臥插座先叫水電不要收。」

輸出：

``` json
{
  "trade": "水電",
  "confidence": 0.97
}
```

高信心直接保存。

低信心才詢問使用者。

## 3. Issue Extraction

AI 至少抽取：

``` text
title
trade
summary
waiting_for
possible_status
```

不要要求過多 schema，避免錯誤率增加。

## 4. Existing Issue Matching

禁止：

> 把整個 Project 的所有歷史直接丟給 LLM。

建議：

``` text
New Transcript
↓
Semantic Retrieval / Embedding
↓
Top 3–5 Candidate Issues
↓
LLM 判斷
↓
Best Match + Confidence
```

## 5. Matching 行為

### 高信心

直接更新，但提供：

> \[不是這件\]

### 中信心

顯示：

> 這似乎是在更新：主臥・插座位置\
> \[是\] \[不是\]

### 低信心

建立 New Issue，或讓使用者從少量候選中選擇。

## 6. Human-in-the-loop 原則

> **AI 猜，人確認。**

目標不是 100% 自動化。

目標是把：

`30 秒人工整理`

降低成：

`0–2 秒確認`

## 7. Resolution Detection

例如：

-   「好了」
-   「已經改好了」
-   「這個不用做了」
-   「業主確認沒問題」
-   「今天驗收完成」

AI 可判斷可能 Resolved。

若語意模糊，詢問一次：

> 這件事情要標記完成嗎？\
> \[完成\] \[還沒\]

## 8. 禁止 AI 做的事

-   判斷工程安全
-   判斷施工是否合法
-   自行下工程指令
-   推測責任歸屬
-   自行承諾工期
-   自行更改重要工程決策

SiteEcho 是 Memory / Follow-up Assistant，不是工程決策者。
