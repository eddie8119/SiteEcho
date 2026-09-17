#!/bin/sh

set -euo pipefail

if [ "${VERCEL_GIT_COMMIT_REF:-}" != "main" ]; then
  echo "Skip preview build for ${VERCEL_GIT_COMMIT_REF}".
  exit 0
fi

npm run build
