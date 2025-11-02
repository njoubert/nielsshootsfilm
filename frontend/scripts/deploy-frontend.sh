#!/usr/bin/env bash
set -euo pipefail

# Frontend deployment script
# Runs tests, builds, and deploys to remote server

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Deployment paths
REMOTE_HOST="macminiserver"
DEPLOY_ASSETS_DIR="/Users/njoubert/webserver/sites/nielsshootsfilm.com/public/assets"
DEPLOY_PUBLIC_DIR="/Users/njoubert/webserver/sites/nielsshootsfilm.com/public"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Check if we're on the target server
HOSTNAME=$(hostname -s)
if [ "$HOSTNAME" = "$REMOTE_HOST" ]; then
    IS_LOCAL=true
    DEPLOY_METHOD="local copy (cp)"
else
    IS_LOCAL=false
    DEPLOY_METHOD="remote copy (scp)"
fi

echo "🚀 Deploying nielsshootsfilm frontend..."
echo ""
if [ "$IS_LOCAL" = true ]; then
    echo "✓ Running on macminiserver - will deploy locally"
else
    echo -e "${YELLOW}⚠️  Running remotely - will deploy via scp${NC}"
fi
echo ""
echo "This will:"
echo "  - Build the frontend with Vite"
echo "  - Deploy built assets to /Users/njoubert/webserver/sites/nielsshootsfilm.com/public/ ($DEPLOY_METHOD)"
echo ""
if [ "$IS_LOCAL" = false ]; then
    echo "Requirements:"
    echo "  - SSH access to macminiserver must be configured"
    echo "  - This machine must be able to scp to macminiserver"
    echo ""
fi
read -p "Proceed with deployment? (y/n) [y]: " -r
echo ""
if [[ -n $REPLY && ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

#echo "🧪 Running frontend tests..."
#./test.sh frontend

echo "🏗️  Building frontend..."
cd "$PROJECT_ROOT"
"$PROJECT_ROOT/frontend/scripts/build.sh"

# Verify build artifacts exist
if [ ! -f "$PROJECT_ROOT/build-bin/frontend/index.html" ]; then
    echo -e "${RED}✗ Error: Build failed - index.html not found${NC}"
    exit 1
fi

if [ ! -d "$PROJECT_ROOT/build-bin/frontend/assets" ]; then
    echo -e "${RED}✗ Error: Build failed - assets directory not found${NC}"
    exit 1
fi

echo ""
echo "📦 Deploying frontend to server..."
if [ "$IS_LOCAL" = true ]; then
    # Local deployment - use cp
    cp "$PROJECT_ROOT"/build-bin/frontend/assets/index-* "$DEPLOY_ASSETS_DIR/"
    cp "$PROJECT_ROOT/build-bin/frontend/index.html" "$DEPLOY_PUBLIC_DIR/"
else
    # Remote deployment - use scp
    scp "$PROJECT_ROOT"/build-bin/frontend/assets/index-* "$REMOTE_HOST:$DEPLOY_ASSETS_DIR/"
    scp "$PROJECT_ROOT/build-bin/frontend/index.html" "$REMOTE_HOST:$DEPLOY_PUBLIC_DIR/"
fi

echo ""
echo -e "${GREEN}✅ Frontend deployment complete!${NC}"
