#!/usr/bin/env bash
# Wrapper for backend hash-password utility

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

if [ ! -d "$BACKEND_DIR" ]; then
    echo "Error: backend directory not found at $BACKEND_DIR"
    exit 1
fi

# Run the Go program from the backend directory where go.mod exists
cd "$BACKEND_DIR"
go run -mod=vendor ./cmd/hash-password "$@"
