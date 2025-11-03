#!/usr/bin/env bash
#
# Unified test runner for both frontend (npm/vitest) and backend (go test)
# Intelligently dispatches to the appropriate test runner based on file path
#
# Usage:
#   ./test.sh                           # Run all tests (backend and frontend unit tests)
#   ./test.sh backend                   # Run all backend unit tests (with race detector)
#   ./test.sh frontend                  # Run all frontend unit tests
#   ./test.sh api                       # Run API integration tests + schema validation
#   ./test.sh -- <path>                 # Run tests for specific path
#   ./test.sh -- backend/...            # Run backend tests
#   ./test.sh -- frontend/...           # Run frontend tests
#   ./test.sh -- storage-stats.test.ts  # Run frontend test by filename
#
# Examples:
#   ./test.sh backend
#   ./test.sh frontend
#   ./test.sh api
#   ./test.sh -- backend/internal/handlers
#   ./test.sh -- frontend/src/components/storage-stats.test.ts
#   ./test.sh -- storage-stats.test.ts
#
# Note: Backend tests always run with -race flag to catch concurrency bugs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${BLUE}ℹ${NC} $*"
}

log_success() {
    echo -e "${GREEN}✓${NC} $*"
}

log_error() {
    echo -e "${RED}✗${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

# Function to run backend tests
run_backend_tests() {
    local test_path="${1:-./...}"

    log_info "Running backend Go tests with -race: $test_path"
    cd "$SCRIPT_DIR/backend"

    # Run tests and filter out harmless macOS linker warnings about LC_DYSYMTAB
    # These warnings are common with the race detector on macOS and can be safely ignored
    if go test -v -race "$test_path" 2>&1 | grep -v "malformed LC_DYSYMTAB"; then
        log_success "Backend tests passed"
        return 0
    else
        log_error "Backend tests failed"
        return 1
    fi
}

# Function to run frontend tests
run_frontend_tests() {
    local test_path="${1:-}"

    log_info "Running frontend tests${test_path:+: $test_path}"
    cd "$SCRIPT_DIR/frontend"

    if [ -n "$test_path" ]; then
        # Run specific test file
        if npm test -- "$test_path"; then
            log_success "Frontend tests passed"
            return 0
        else
            log_error "Frontend tests failed"
            return 1
        fi
    else
        # Run all frontend tests
        if npm test; then
            log_success "Frontend tests passed"
            return 0
        else
            log_error "Frontend tests failed"
            return 1
        fi
    fi
}

# Function to run API integration tests
run_api_tests() {
    log_info "Running API integration tests"
    cd "$SCRIPT_DIR"

    local api_result=0
    local schema_result=0

    # Run API tests
    if bash ./scripts/test-api.sh; then
        log_success "API tests passed"
    else
        log_error "API tests failed"
        api_result=1
    fi

    # Run schema validation tests
    log_info "Running schema validation tests"
    if bash ./scripts/test-schema-validation.sh; then
        log_success "Schema validation tests passed"
    else
        log_error "Schema validation tests failed"
        schema_result=1
    fi

    if [ $api_result -eq 0 ] && [ $schema_result -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Main logic
main() {
    local test_path=""
    local run_backend=true
    local run_frontend=true
    local run_api=false

    # Parse arguments
    if [ $# -gt 0 ]; then
        # Check for subcommands
        case "$1" in
            backend)
                log_info "Running backend tests only"
                run_frontend=false
                shift
                ;;
            frontend)
                log_info "Running frontend tests only"
                run_backend=false
                shift
                ;;
            api)
                log_info "Running API integration tests"
                run_backend=false
                run_frontend=false
                run_api=true
                shift
                ;;
            --)
                shift
                if [ $# -gt 0 ]; then
                    test_path="$1"
                fi
                ;;
            *)
                # If not a known subcommand, treat as a path
                test_path="$1"
                ;;
        esac
    fi

    # Determine what to run based on path
    if [ -n "$test_path" ]; then
        # Check if path contains backend or frontend indicators
        if [[ "$test_path" == backend/* ]] || [[ "$test_path" == ./backend/* ]]; then
            # Backend test path
            run_frontend=false
            # Strip backend/ prefix if present
            test_path="${test_path#backend/}"
            test_path="${test_path#./backend/}"
            test_path="./$test_path"
        elif [[ "$test_path" == frontend/* ]] || [[ "$test_path" == ./frontend/* ]] || [[ "$test_path" == src/* ]] || [[ "$test_path" == *.test.ts ]]; then
            # Frontend test path
            run_backend=false
            # Strip frontend/ prefix if present
            test_path="${test_path#frontend/}"
            test_path="${test_path#./frontend/}"
        elif [[ "$test_path" == *_test.go ]]; then
            # Go test file
            run_frontend=false
        else
            log_warning "Could not determine test type from path: $test_path"
            log_info "Attempting to run as backend test (Go)"
            run_frontend=false
        fi
    fi


    local backend_result=0
    local frontend_result=0
    local api_result=0

    # Run API tests if requested
    if [ "$run_api" = true ]; then
        run_api_tests || api_result=$?

        echo ""
        echo "═══════════════════════════════════════════════════════════"
        if [ $api_result -eq 0 ]; then
            log_success "API tests passed!"
            exit 0
        else
            log_error "API tests failed"
            exit 1
        fi
    fi

    # Run tests
    if [ "$run_backend" = true ]; then
        if [ -n "$test_path" ]; then
            run_backend_tests "$test_path" || backend_result=$?
        else
            run_backend_tests "./..." || backend_result=$?
        fi
    fi

    if [ "$run_frontend" = true ]; then
        if [ -n "$test_path" ]; then
            run_frontend_tests "$test_path" || frontend_result=$?
        else
            run_frontend_tests || frontend_result=$?
        fi
    fi    # Report results
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    if [ "$run_backend" = true ] && [ "$run_frontend" = true ]; then
        if [ $backend_result -eq 0 ] && [ $frontend_result -eq 0 ]; then
            log_success "All tests passed!"
            exit 0
        else
            log_error "Some tests failed:"
            [ $backend_result -ne 0 ] && log_error "  - Backend tests failed"
            [ $frontend_result -ne 0 ] && log_error "  - Frontend tests failed"
            exit 1
        fi
    elif [ "$run_backend" = true ]; then
        if [ $backend_result -eq 0 ]; then
            log_success "Backend tests passed!"
            exit 0
        else
            log_error "Backend tests failed"
            exit 1
        fi
    elif [ "$run_frontend" = true ]; then
        if [ $frontend_result -eq 0 ]; then
            log_success "Frontend tests passed!"
            exit 0
        else
            log_error "Frontend tests failed"
            exit 1
        fi
    fi
}

main "$@"
