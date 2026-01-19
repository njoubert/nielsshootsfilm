#!/usr/bin/env bash
# Lint TypeScript/JavaScript files

set -e

cd "$(dirname "$0")/.."
exec pnpm run lint
