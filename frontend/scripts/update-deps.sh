#!/usr/bin/env bash
# Check for and optionally update pnpm dependencies
# Usage: ./update-deps.sh [--check | --update]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$FRONTEND_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

usage() {
    echo "Usage: $0 [--check | --update | --help]"
    echo ""
    echo "Options:"
    echo "  --check   Check for outdated dependencies (default)"
    echo "  --update  Interactively update dependencies"
    echo "  --help    Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0              # Check for updates"
    echo "  $0 --check      # Check for updates"
    echo "  $0 --update     # Update dependencies interactively"
}

check_updates() {
    echo -e "${BLUE}Checking for dependency updates...${NC}"
    echo ""

    # Get list of outdated packages
    outdated=$(pnpm outdated --format json 2>/dev/null || echo "{}")

    # Check if there are any updates
    if [ "$outdated" = "{}" ] || [ -z "$outdated" ]; then
        echo -e "${GREEN}✓ All dependencies are up to date!${NC}"
        return 0
    fi

    echo -e "${YELLOW}Dependencies with available updates:${NC}"
    echo ""

    # Parse JSON and display nicely
    # pnpm outdated --format json returns: {"package": {"current": "x", "latest": "y", "wanted": "z"}}
    echo "$outdated" | jq -r 'to_entries[] | "\(.key)|\(.value.current)|\(.value.wanted)|\(.value.latest)"' 2>/dev/null | while IFS='|' read -r package current wanted latest; do
        echo -e "  ${BLUE}$package${NC}"
        echo -e "    Current: $current"
        if [ "$wanted" != "$latest" ]; then
            echo -e "    Wanted:  $wanted (semver compatible)"
        fi
        echo -e "    Latest:  ${GREEN}$latest${NC}"
        echo ""
    done

    return 1
}

update_deps() {
    echo -e "${BLUE}Checking for dependency updates...${NC}"
    echo ""

    # Get list of outdated packages as JSON
    outdated=$(pnpm outdated --format json 2>/dev/null || echo "{}")

    if [ "$outdated" = "{}" ] || [ -z "$outdated" ]; then
        echo -e "${GREEN}✓ All dependencies are up to date!${NC}"
        return 0
    fi

    echo -e "${YELLOW}The following updates are available:${NC}"
    echo ""

    # Store packages in arrays for later
    declare -a packages
    declare -a latests
    i=0

    while IFS='|' read -r package current wanted latest; do
        [ -z "$package" ] && continue

        # Check if dev dependency
        is_dev=""
        if grep -q "\"$package\"" package.json 2>/dev/null && grep -A1000 '"devDependencies"' package.json | grep -q "\"$package\""; then
            is_dev=" (dev)"
        fi

        echo -e "  [$i] ${BLUE}$package${NC}${is_dev}"
        echo -e "      $current → ${GREEN}$latest${NC}"

        packages[$i]="$package"
        latests[$i]="$latest"
        ((i++)) || true
    done < <(echo "$outdated" | jq -r 'to_entries[] | "\(.key)|\(.value.current)|\(.value.wanted)|\(.value.latest)"' 2>/dev/null)

    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  [a] Update ALL to latest versions"
    echo "  [w] Update to wanted versions only (semver compatible)"
    echo "  [n] Enter specific numbers (comma-separated, e.g., 0,2,5)"
    echo "  [q] Quit without updating"
    echo ""
    read -r -p "Choice: " choice

    case "$choice" in
        a|A)
            echo ""
            echo -e "${BLUE}Updating all dependencies to latest...${NC}"
            pnpm update --latest
            ;;
        w|W)
            echo ""
            echo -e "${BLUE}Updating to semver-compatible versions...${NC}"
            pnpm update
            ;;
        q|Q)
            echo "Cancelled."
            return 0
            ;;
        *)
            # Parse comma-separated numbers
            IFS=',' read -ra nums <<< "$choice"
            echo ""
            for num in "${nums[@]}"; do
                num=$(echo "$num" | tr -d ' ')
                if [[ "$num" =~ ^[0-9]+$ ]] && [ -n "${packages[$num]}" ]; then
                    echo -e "${BLUE}Updating ${packages[$num]} to ${latests[$num]}...${NC}"
                    pnpm add "${packages[$num]}@${latests[$num]}"
                else
                    echo -e "${RED}Invalid selection: $num${NC}"
                fi
            done
            ;;
    esac

    echo ""
    echo -e "${BLUE}Fetching packages to local store...${NC}"
    pnpm fetch

    echo ""
    echo -e "${GREEN}✓ Dependencies updated and vendored!${NC}"
    echo ""
    echo -e "${YELLOW}Don't forget to commit the changes:${NC}"
    echo "  git add .pnpm-store pnpm-lock.yaml package.json"
    echo "  git commit -m 'chore: update frontend dependencies'"
}

# Parse arguments
case "${1:-}" in
    --help|-h)
        usage
        exit 0
        ;;
    --update|-u)
        update_deps
        ;;
    --check|-c|"")
        check_updates
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        usage
        exit 1
        ;;
esac
