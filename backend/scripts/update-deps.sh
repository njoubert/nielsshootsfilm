#!/usr/bin/env bash
# Check for and optionally update Go dependencies
# Usage: ./update-deps.sh [--check | --update]

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$BACKEND_DIR"

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

    # Get list of dependencies that have updates available
    # go list -m -u all shows current and latest versions
    updates=$(go list -m -u all 2>/dev/null | grep '\[' || true)

    if [ -z "$updates" ]; then
        echo -e "${GREEN}✓ All dependencies are up to date!${NC}"
        return 0
    fi

    echo -e "${YELLOW}Dependencies with available updates:${NC}"
    echo ""
    echo "$updates" | while read -r line; do
        # Parse: module v1.0.0 [v1.1.0]
        module=$(echo "$line" | awk '{print $1}')
        current=$(echo "$line" | awk '{print $2}')
        latest=$(echo "$line" | grep -o '\[v[^]]*\]' | tr -d '[]')

        echo -e "  ${BLUE}$module${NC}"
        echo -e "    Current: $current"
        echo -e "    Latest:  ${GREEN}$latest${NC}"
        echo ""
    done

    return 1
}

update_deps() {
    echo -e "${BLUE}Checking for dependency updates...${NC}"
    echo ""

    # Get list of direct dependencies only (from go.mod require block)
    direct_deps=$(go list -m -f '{{if not .Indirect}}{{.Path}}{{end}}' all 2>/dev/null | grep -v "^$" | grep -v "$(go list -m)" || true)

    # Get updates for each direct dependency
    updates=$(go list -m -u all 2>/dev/null | grep '\[' || true)

    if [ -z "$updates" ]; then
        echo -e "${GREEN}✓ All dependencies are up to date!${NC}"
        return 0
    fi

    echo -e "${YELLOW}The following updates are available:${NC}"
    echo ""

    # Store updates in array for later
    declare -a update_list
    i=0

    while read -r line; do
        [ -z "$line" ] && continue

        module=$(echo "$line" | awk '{print $1}')
        current=$(echo "$line" | awk '{print $2}')
        latest=$(echo "$line" | grep -o '\[v[^]]*\]' | tr -d '[]')

        # Check if this is a direct dependency
        is_direct=""
        if echo "$direct_deps" | grep -q "^${module}$"; then
            is_direct=" (direct)"
        fi

        echo -e "  [$i] ${BLUE}$module${NC}${is_direct}"
        echo -e "      $current → ${GREEN}$latest${NC}"

        update_list[$i]="$module@$latest"
        ((i++)) || true
    done <<< "$updates"

    echo ""
    echo -e "${YELLOW}Options:${NC}"
    echo "  [a] Update ALL dependencies"
    echo "  [d] Update only DIRECT dependencies"
    echo "  [n] Enter specific numbers (comma-separated, e.g., 0,2,5)"
    echo "  [q] Quit without updating"
    echo ""
    read -r -p "Choice: " choice

    case "$choice" in
        a|A)
            echo ""
            echo -e "${BLUE}Updating all dependencies...${NC}"
            go get -u ./...
            ;;
        d|D)
            echo ""
            echo -e "${BLUE}Updating direct dependencies...${NC}"
            go get -u $(echo "$direct_deps" | tr '\n' ' ')
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
                if [[ "$num" =~ ^[0-9]+$ ]] && [ -n "${update_list[$num]}" ]; then
                    echo -e "${BLUE}Updating ${update_list[$num]}...${NC}"
                    go get "${update_list[$num]}"
                else
                    echo -e "${RED}Invalid selection: $num${NC}"
                fi
            done
            ;;
    esac

    echo ""
    echo -e "${BLUE}Running go mod tidy...${NC}"
    go mod tidy

    echo ""
    echo -e "${BLUE}Regenerating vendor directory...${NC}"
    go mod vendor

    echo ""
    echo -e "${GREEN}✓ Dependencies updated and vendored!${NC}"
    echo ""
    echo -e "${YELLOW}Don't forget to commit the changes:${NC}"
    echo "  git add vendor go.mod go.sum"
    echo "  git commit -m 'chore: update Go dependencies'"
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
