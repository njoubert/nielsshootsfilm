#!/usr/bin/env bash
# Build frontend for production and prepare for static hosting
# This script builds in an isolated /build/frontend directory to prevent source pollution

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$FRONTEND_DIR/.." && pwd)"
TEMP_BUILD_DIR="$PROJECT_ROOT/build/frontend"
FINAL_BUILD_DIR="$PROJECT_ROOT/build-bin/frontend"

echo "🧹 Cleaning previous builds..."
rm -rf "$TEMP_BUILD_DIR"
rm -rf "$FINAL_BUILD_DIR"

echo "📦 Copying frontend source to isolated build directory..."
mkdir -p "$TEMP_BUILD_DIR"
# Copy all source files excluding node_modules, dist, build artifacts, and env symlink
rsync -a --exclude='node_modules' --exclude='dist' --exclude='build' --exclude='*.log' --exclude='env' \
  "$FRONTEND_DIR/" "$TEMP_BUILD_DIR/"

echo "� Copying env file from project root (if exists)..."
if [ -f "$PROJECT_ROOT/env" ]; then
  cp "$PROJECT_ROOT/env" "$TEMP_BUILD_DIR/env"
  echo "  ✓ Copied env file"
else
  echo "  ℹ️  No env file found (using defaults)"
fi

echo "📥 Installing dependencies in build directory..."
cd "$TEMP_BUILD_DIR"
pnpm install --frozen-lockfile 2>/dev/null || pnpm install

echo "🏗️  Building frontend..."
pnpm run build

echo "📁 Preparing final build directory structure..."
mkdir -p "$FINAL_BUILD_DIR"

echo "📄 Moving built assets..."
# Copy the built files from dist to final location
cp -r "$TEMP_BUILD_DIR/dist/"* "$FINAL_BUILD_DIR/"

echo "📊 Copying data directory..."
cp -r "$PROJECT_ROOT/data" "$FINAL_BUILD_DIR/data"

echo "🖼️  Copying uploads directory..."
mkdir -p "$FINAL_BUILD_DIR/uploads"
cp -r "$PROJECT_ROOT/static/uploads/"* "$FINAL_BUILD_DIR/uploads/" 2>/dev/null || true

# Load deployment configuration from env if available
if [ -f "$PROJECT_ROOT/env" ]; then
  # Source only the DEPLOY_* variables from env
  # shellcheck disable=SC2046
  export $(grep -E "^DEPLOY_(USER|HOST|PATH)=" "$PROJECT_ROOT/env" | xargs)
fi

echo ""
echo "✅ Build complete!"
echo "Production files are in: $FINAL_BUILD_DIR"
echo ""
echo "� Directory structure:"
echo "  $FINAL_BUILD_DIR/"
echo "  ├── index.html"
echo "  ├── assets/          (JS and CSS)"
echo "  ├── data/            (JSON data files)"
echo "  └── uploads/         (images)"
echo ""
echo "The site expects to be served from the domain root (e.g., nielsshootsfilm.com/)"
