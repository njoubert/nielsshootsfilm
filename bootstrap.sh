#!/bin/bash
set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Project root directory
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/." && pwd)"

echo -e "${GREEN}=== Photography Portfolio Bootstrap ===${NC}\n"

# Create directories
echo "Creating required directories..."
mkdir -p "$PROJECT_ROOT/data"
mkdir -p "$PROJECT_ROOT/static/uploads/originals"
mkdir -p "$PROJECT_ROOT/static/uploads/display"
mkdir -p "$PROJECT_ROOT/static/uploads/thumbnails"
echo -e "${GREEN}✓ Directories created${NC}\n"

# Setup env file
if [ ! -f "$PROJECT_ROOT/env" ]; then
    echo "Creating env file from template..."
    cp "$PROJECT_ROOT/env.example" "$PROJECT_ROOT/env"
    echo -e "${GREEN}✓ env file created${NC}"
    echo -e "${YELLOW}  → Edit env to customize your configuration${NC}\n"
else
    echo -e "${YELLOW}⚠ env already exists, skipping${NC}\n"
fi

# Update DATA_DIR and UPLOAD_DIR with absolute paths
if [ -f "$PROJECT_ROOT/env" ]; then
    echo "Updating env with paths to DATA_DIR and UPLOAD_DIR..."
    # Update or add DATA_DIR
    if grep -q "^DATA_DIR=" "$PROJECT_ROOT/env"; then
        sed -i.bak "s|^DATA_DIR=.*|DATA_DIR=$PROJECT_ROOT/data|" "$PROJECT_ROOT/env"
    else
        echo "DATA_DIR=$PROJECT_ROOT/data" >> "$PROJECT_ROOT/env"
    fi
    # Update or add UPLOAD_DIR
    if grep -q "^UPLOAD_DIR=" "$PROJECT_ROOT/env"; then
        sed -i.bak "s|^UPLOAD_DIR=.*|UPLOAD_DIR=$PROJECT_ROOT/static/uploads|" "$PROJECT_ROOT/env"
    else
        echo "UPLOAD_DIR=$PROJECT_ROOT/static/uploads" >> "$PROJECT_ROOT/env"
    fi
    rm -f "$PROJECT_ROOT/env.bak"
    echo -e "${GREEN}✓ Updated DATA_DIR and UPLOAD_DIR with absolute paths${NC}\n"
fi

# Create symlinks for env in backend and frontend if they don't exist
echo "Setting up env symlinks..."
if [ ! -L "$PROJECT_ROOT/backend/env" ]; then
    ln -s ../env "$PROJECT_ROOT/backend/env"
    echo -e "${GREEN}✓ Created backend/env symlink${NC}"
else
    echo -e "${YELLOW}⚠ backend/env symlink already exists${NC}"
fi

if [ ! -L "$PROJECT_ROOT/frontend/env" ]; then
    ln -s ../env "$PROJECT_ROOT/frontend/env"
    echo -e "${GREEN}✓ Created frontend/env symlink${NC}"
else
    echo -e "${YELLOW}⚠ frontend/env symlink already exists${NC}"
fi
echo ""

# Initialize albums.json if it doesn't exist
if [ ! -f "$PROJECT_ROOT/data/albums.json" ]; then
    echo "Initializing albums.json..."
    cat > "$PROJECT_ROOT/data/albums.json" <<'EOF'
{
  "version": "1.0",
  "last_updated": "2024-01-01T00:00:00Z",
  "albums": []
}
EOF
    echo -e "${GREEN}✓ albums.json created${NC}\n"
else
    echo -e "${YELLOW}⚠ albums.json already exists, skipping${NC}\n"
fi

# Initialize site_config.json if it doesn't exist
if [ ! -f "$PROJECT_ROOT/data/site_config.json" ]; then
    echo "Initializing site_config.json..."
    cat > "$PROJECT_ROOT/data/site_config.json" <<'EOF'
{
  "version": "1.0",
  "last_updated": "2024-01-01T00:00:00Z",
  "site": {
    "title": "My Photography Portfolio",
    "language": "en",
    "timezone": "UTC"
  },
  "owner": {},
  "social": {},
  "branding": {
    "primary_color": "#1a1a1a",
    "secondary_color": "#ffffff",
    "accent_color": "#4a90e2",
    "theme": {
      "mode": "system",
      "light": {
        "background": "#ffffff",
        "surface": "#f5f5f5",
        "text_primary": "#1a1a1a",
        "text_secondary": "#666666",
        "border": "#e0e0e0"
      },
      "dark": {
        "background": "#121212",
        "surface": "#1e1e1e",
        "text_primary": "#ffffff",
        "text_secondary": "#b0b0b0",
        "border": "#333333"
      }
    }
  },
  "portfolio": {
    "show_exif_data": true,
    "enable_lightbox": true
  },
  "navigation": {
    "show_home": true,
    "show_albums": true,
  },
  "features": {}
}
EOF
    echo -e "${GREEN}✓ site_config.json created${NC}\n"
else
    echo -e "${YELLOW}⚠ site_config.json already exists, skipping${NC}\n"
fi

# Initialize admin_config.json if it doesn't exist
if [ ! -f "$PROJECT_ROOT/data/admin_config.json" ]; then
    echo -e "${YELLOW}admin_config.json does not exist. Creating it now.${NC}"
    echo "You will be prompted to set an admin password."
    echo ""

    # Prompt for admin password
    read -r -s -p "Enter admin password: " ADMIN_PASSWORD
    echo ""
    read -r -s -p "Confirm admin password: " ADMIN_PASSWORD_CONFIRM
    echo -e "\n"

    if [ "$ADMIN_PASSWORD" != "$ADMIN_PASSWORD_CONFIRM" ]; then
        echo -e "${RED}✗ Passwords do not match${NC}"
        exit 1
    fi

    if [ -z "$ADMIN_PASSWORD" ]; then
        echo -e "${RED}✗ Password cannot be empty${NC}"
        exit 1
    fi

    # Generate bcrypt hash using Go from backend directory (where bcrypt is installed)
    echo "Generating password hash..."
    HASH=$(cd "$PROJECT_ROOT/backend" && "$PROJECT_ROOT/scripts/hash-password.sh" "$ADMIN_PASSWORD")

    # Create admin_config.json
    cat > "$PROJECT_ROOT/data/admin_config.json" <<EOF
{
  "username": "admin",
  "password_hash": "$HASH"
}
EOF
    echo -e "${GREEN}✓ admin_config.json created${NC}"
else
    echo -e "${YELLOW}⚠ admin_config.json already exists, skipping${NC}\n"
fi

echo -e "${GREEN}=== Bootstrap Complete ===${NC}"
