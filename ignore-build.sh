#!/bin/bash

echo "檢查目前分支: $VERCEL_GIT_COMMIT_REF"

if [ "$VERCEL_GIT_COMMIT_REF" == "main" ] ; then
  # 如果是 main 分支，回傳 1 (不要忽略，繼續建置)
  echo "✅ 確認為 main 分支，開始建置..."
  exit 1;
else
  # 如果不是 main 分支，回傳 0 (忽略，停止建置)
  echo "🛑 非 main 分支 ($VERCEL_GIT_COMMIT_REF)，已自動取消部署。"
  exit 0;
fi