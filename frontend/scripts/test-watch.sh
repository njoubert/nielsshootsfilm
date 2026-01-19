#!/usr/bin/env bash
# Run tests in watch mode for development

set -e

cd "$(dirname "$0")/.."
exec pnpm run test:watch
