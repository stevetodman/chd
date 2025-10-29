#!/usr/bin/env bash
set -euo pipefail

npm ci

node --version

npm run build

if [ ! -d dist ]; then
  echo "dist/ directory is missing after build" >&2
  exit 1
fi

ls -lah dist/
