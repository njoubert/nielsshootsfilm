#!/usr/bin/env bash
# Build the admin server binary
# This script builds in an isolated /build/backend directory to prevent source pollution

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$BACKEND_DIR/.." && pwd)"
TEMP_BUILD_DIR="$PROJECT_ROOT/build/backend"
FINAL_BUILD_DIR="$PROJECT_ROOT/build-bin/backend"

echo "🧹 Cleaning previous builds..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$FINAL_BUILD_DIR"

echo "📦 Copying backend source to isolated build directory..."
mkdir -p "$TEMP_BUILD_DIR"
# Copy all source files excluding build artifacts and env symlink
rsync -a --exclude='bin' --exclude='*.log' --exclude='coverage.*' --exclude='env' \
  "$BACKEND_DIR/" "$TEMP_BUILD_DIR/"

echo "📋 Copying env file from project root (if exists)..."
if [ -f "$PROJECT_ROOT/env" ]; then
  cp "$PROJECT_ROOT/env" "$TEMP_BUILD_DIR/env"
  echo "  ✓ Copied env file"
else
  echo "  ℹ️  No env file found (will use system environment variables)"
fi

echo "🏗️  Building backend (using vendored dependencies)..."
cd "$TEMP_BUILD_DIR"
# Build with vendored dependencies - no network access needed
go build -mod=vendor -o admin ./cmd/admin

echo "📁 Preparing final build directory..."
mkdir -p "$FINAL_BUILD_DIR"

echo "📄 Moving binary to final location..."
mv admin "$FINAL_BUILD_DIR/admin"

echo "📄 Moving env to final location..."
cp env "$FINAL_BUILD_DIR/env"

echo ""
echo "✅ Build complete!"
echo "Binary location: $FINAL_BUILD_DIR/admin"
echo ""
echo "🚀 To run the admin server:"
echo "  cd $PROJECT_ROOT"
echo "  ./build-bin/backend/admin --env-file ./env"
echo ""
echo "  Or with absolute path:"
echo "  ./build-bin/backend/admin --env-file $FINAL_BUILD_DIR/env"
echo ""
