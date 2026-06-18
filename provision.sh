#!/usr/bin/env bash
#
# Provision Script for nielsshootsfilm-planfirst
#
# This script sets up all dependencies needed to develop on this project.
# Run this after cloning the repository for the first time.
#
# Usage: ./provision.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}=================================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}=================================================${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "  $1"
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Detect OS
detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
    else
        OS="unknown"
    fi
}

# Check if Homebrew is installed (macOS)
check_homebrew() {
    if [[ "$OS" == "macos" ]]; then
        if ! command_exists brew; then
            print_error "Homebrew not found"
            print_info "Install Homebrew from: https://brew.sh"
            print_info "Run: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        else
            print_success "Homebrew installed"
        fi
    fi
}

# Install Node.js
install_node() {
    print_header "Installing Node.js"

    if command_exists node; then
        NODE_VERSION=$(node --version)
        print_success "Node.js already installed: $NODE_VERSION"

        # Check version requirement (>= 24.11.0)
        REQUIRED_VERSION="24.11.0"
        CURRENT_VERSION=$(node --version | sed 's/v//')

        # Compare versions using sort -V
        if ! printf '%s\n' "$REQUIRED_VERSION" "$CURRENT_VERSION" | sort -V -C 2>/dev/null; then
            print_warning "Node.js version is $NODE_VERSION, but v24.11.0 or higher is recommended"
            print_info "v24.11.0 is the LTS (Long Term Support) version as of October 2024"
            print_info "Consider upgrading with: brew upgrade node"
        fi
    else
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing Node.js v24 LTS via Homebrew..."
            brew install node@24
            print_success "Node.js installed"
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing Node.js via nvm recommended"
            print_info "Visit: https://github.com/nvm-sh/nvm"
            print_info "Recommended: nvm install 24.11.0"
            print_warning "Please install Node.js 24.11.0 or higher manually"
        fi
    fi
}

# Install pnpm (fast, disk-efficient package manager)
install_pnpm() {
    print_header "Installing pnpm"

    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm already installed: v$PNPM_VERSION"
    else
        if command_exists node; then
            print_info "Installing pnpm via corepack..."
            # corepack is included with Node.js 16.10+
            corepack enable
            corepack prepare pnpm@latest --activate
            print_success "pnpm installed via corepack"
        elif [[ "$OS" == "macos" ]]; then
            print_info "Installing pnpm via Homebrew..."
            brew install pnpm
            print_success "pnpm installed"
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing pnpm via npm..."
            npm install -g pnpm
            print_success "pnpm installed"
        fi
    fi

    # Verify pnpm
    if command_exists pnpm; then
        PNPM_VERSION=$(pnpm --version)
        print_success "pnpm ready: v$PNPM_VERSION"
    else
        print_error "pnpm installation failed"
        print_info "Try: npm install -g pnpm"
        exit 1
    fi
}

# Install Go
install_go() {
    print_header "Installing Go"

    if command_exists go; then
        GO_VERSION=$(go version | awk '{print $3}')
        print_success "Go already installed: $GO_VERSION"

        # Check version requirement (>= 1.25)
        REQUIRED_VERSION="1.25"
        CURRENT_VERSION=$(go version | awk '{print $3}' | sed 's/go//')

        if ! printf '%s\n' "$REQUIRED_VERSION" "$CURRENT_VERSION" | sort -V -C 2>/dev/null; then
            print_warning "Go version is $GO_VERSION, but 1.25 or higher is recommended"
        fi
    else
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing Go via Homebrew..."
            brew install go
            print_success "Go installed"
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing Go..."
            print_info "Visit: https://go.dev/doc/install"
            print_warning "Please install Go 1.25 or higher manually"
        fi
    fi

    # Verify Go installation
    if command_exists go; then
        print_success "Go ready: $(go version | awk '{print $3}')"
    else
        print_error "Go installation failed"
        exit 1
    fi

    if command_exists goimports; then
        print_success "Goimports already installed"
    else
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing Goimports via Homebrew..."
            brew install goimports
            print_success "Goimports installed"
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing Goimports..."
            print_info "Visit: https://go.dev/doc/install"
            print_warning "Please install goimports manually"
        fi
    fi

    # Verify Go installation
    if command_exists go; then
        print_success "Go ready: $(go version | awk '{print $3}')"
    else
        print_error "Go installation failed"
        exit 1
    fi

}

# Install frontend dependencies
install_frontend_deps() {
    print_header "Installing Frontend Dependencies"

    if [ ! -d "frontend" ]; then
        print_error "frontend directory not found"
        exit 1
    fi

    cd frontend

    if [ ! -f "package.json" ]; then
        print_error "package.json not found"
        exit 1
    fi

    print_info "Installing packages with pnpm..."
    pnpm install

    print_success "Frontend dependencies installed"
    cd ..
}

# Install backend dependencies
install_backend_deps() {
    print_header "Installing Backend Dependencies"

    if [ ! -d "backend" ]; then
        print_error "backend directory not found"
        exit 1
    fi

    cd backend

    if [ ! -f "go.mod" ]; then
        print_error "go.mod not found"
        exit 1
    fi

    print_info "Downloading Go modules..."
    go mod download

    print_info "Tidying Go modules..."
    go mod tidy

    # Verify the build works in vendor mode. The backend commits its vendor/
    # directory for hermetic builds and Go uses -mod=vendor by default when one
    # exists, so an incomplete vendor tree (e.g. a package silently dropped by a
    # .gitignore rule) only surfaces here, not via `go mod download`/`tidy`.
    if [ -d "vendor" ]; then
        print_info "Verifying backend build (vendor mode)..."
        if go build -mod=vendor ./...; then
            print_success "Backend build succeeded (vendor mode)"
        else
            print_error "Backend build failed in vendor mode"
            print_info "The committed vendor/ directory may be incomplete or out of sync."
            print_info "Try regenerating it: (cd backend && go mod vendor)"
            exit 1
        fi
    fi

    print_success "Backend dependencies installed"
    cd ..
}

# Install prek (fast, Rust-based pre-commit replacement)
install_precommit() {
    print_header "Installing prek (Pre-commit Hooks)"

    if command_exists prek; then
        print_success "prek already installed"
    else
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing prek via Homebrew..."
            brew install prek
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing prek via Homebrew..."
            if command_exists brew; then
                brew install prek
            else
                print_warning "Homebrew not found on Linux"
                print_info "Install prek manually: https://github.com/j178/prek"
            fi
        fi
    fi

    # Install git hooks
    if [ -f ".pre-commit-config.yaml" ]; then
        print_info "Installing git hook scripts..."
        prek install

        # Generate secrets baseline if it doesn't exist
        if [ ! -f ".secrets.baseline" ]; then
            print_info "Generating secrets baseline..."
            if command_exists detect-secrets; then
                detect-secrets scan > .secrets.baseline
                print_success "Secrets baseline generated"
            else
                print_warning "detect-secrets not found, skipping baseline generation"
            fi
        fi

        print_success "prek hooks installed"
    else
        print_warning "No .pre-commit-config.yaml found"
    fi
}

# Install libvips for image processing
install_vips() {
    print_header "Installing libvips (Image Processing)"

    if command_exists vips; then
        VIPS_VERSION=$(vips --version | head -n 1)
        print_success "libvips already installed: $VIPS_VERSION"
    else
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing libvips via Homebrew..."
            brew install vips
            print_success "libvips installed"
        elif [[ "$OS" == "linux" ]]; then
            print_info "Installing libvips..."
            if command_exists apt-get; then
                sudo apt-get update
                sudo apt-get install -y libvips-dev
            elif command_exists yum; then
                sudo yum install -y vips-devel
            else
                print_warning "libvips not installed (required for image uploads)"
                print_info "Install manually: https://www.libvips.org/install.html"
                return 1
            fi
            print_success "libvips installed"
        fi
    fi

    # Install libheif for HEIC/HEIF support
    if [[ "$OS" == "macos" ]]; then
        if command_exists brew && ! brew list libheif &>/dev/null; then
            print_info "Installing libheif for HEIC/HEIF support..."
            brew install libheif
            print_success "libheif installed"
        else
            print_success "libheif already installed or available"
        fi
    elif [[ "$OS" == "linux" ]]; then
        if command_exists apt-get; then
            print_info "Installing libheif for HEIC/HEIF support..."
            sudo apt-get install -y libheif-dev
            print_success "libheif installed"
        elif command_exists yum; then
            print_warning "libheif may need manual installation on this system"
            print_info "HEIC/HEIF support requires libheif"
        fi
    fi

    # Verify libvips installation
    if command_exists vips; then
        print_success "libvips ready: $(vips --version | head -n 1)"
    else
        print_error "libvips installation failed"
        print_info "This is required for image upload functionality"
        return 1
    fi
}

# Install optional tools
install_devex_tools() {
    print_header "Installing Optional Development Tools"

    # Shell script linting tool (shellcheck)
    if ! command_exists shellcheck; then
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing shellcheck..."
            brew install shellcheck
            print_success "shellcheck installed"
        elif [[ "$OS" == "linux" ]]; then
            if command_exists apt-get; then
                print_info "Installing shellcheck..."
                sudo apt-get install -y shellcheck
                print_success "shellcheck installed"
            elif command_exists yum; then
                print_info "Installing shellcheck..."
                sudo yum install -y ShellCheck
                print_success "shellcheck installed"
            else
                print_warning "shellcheck not installed (optional)"
                print_info "Install from: https://github.com/koalaman/shellcheck#installing"
            fi
        fi
    else
        print_success "shellcheck already installed"
    fi

    # golangci-lint for Go linting
    if ! command_exists golangci-lint; then
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing golangci-lint..."
            brew install golangci-lint
            print_success "golangci-lint installed"
        else
            print_warning "golangci-lint not installed (optional)"
            print_info "Install from: https://golangci-lint.run/usage/install/"
        fi
    else
        print_success "golangci-lint already installed"
    fi

    # jq for JSON processing (useful for scripts)
    if ! command_exists jq; then
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing jq..."
            brew install jq
            print_success "jq installed"
        else
            print_warning "jq not installed (optional)"
        fi
    else
        print_success "jq already installed"
    fi

    # direnv for automatic environment loading
    if ! command_exists direnv; then
        if [[ "$OS" == "macos" ]]; then
            print_info "Installing direnv..."
            brew install direnv
            print_success "direnv installed"
            print_warning "Add direnv hook to your shell config:"
            print_info "  For zsh: echo 'eval \"\$(direnv hook zsh)\"' >> ~/.zshrc"
            print_info "  For bash: echo 'eval \"\$(direnv hook bash)\"' >> ~/.bashrc"
            print_info "  Then restart your shell or run: source ~/.zshrc"
        elif [[ "$OS" == "linux" ]]; then
            if command_exists apt-get; then
                print_info "Installing direnv..."
                sudo apt-get install -y direnv
                print_success "direnv installed"
            else
                print_warning "direnv not installed (optional)"
                print_info "Install from: https://direnv.net/docs/installation.html"
            fi
        fi
    else
        print_success "direnv already installed"
    fi
}

# Setup direnv
setup_direnv() {
    print_header "Setting up direnv"

    if ! command_exists direnv; then
        print_warning "direnv not installed - skipping envrc setup"
        print_info "direnv was not installed (it's optional)"
        print_info "To use it later, install with: brew install direnv"
        return
    fi

    if [ -f "envrc" ]; then
        print_info "Allowing envrc for automatic environment loading..."
        if direnv allow; then
            print_success "direnv configured - environment will load automatically"
            print_info "Note: You need to add the direnv hook to your shell if you haven't already:"
            print_info "  For zsh:  echo 'eval \"\$(direnv hook zsh)\"' >> ~/.zshrc"
            print_info "  For bash: echo 'eval \"\$(direnv hook bash)\"' >> ~/.bashrc"
            print_info "  Then restart your shell or run: source ~/.zshrc"
        else
            print_warning "Failed to allow envrc - you can run 'direnv allow' manually"
        fi
    else
        print_warning "envrc file not found - skipping"
    fi
}

# Run bootstrap script
run_bootstrap() {
    print_header "Running Project Bootstrap"

    if [ -f "bootstrap.sh" ]; then
        print_info "This will set up data files and admin credentials"
        read -p "Run bootstrap script now? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ./bootstrap.sh
        else
            print_warning "Skipped bootstrap - run './bootstrap.sh' manually later"
        fi
    else
        print_warning "Bootstrap script not found"
    fi
}

# Verify installation
verify_installation() {
    print_header "Verifying Installation"

    local all_good=true

    # Check Node.js
    if command_exists node; then
        print_success "Node.js: $(node --version)"
    else
        print_error "Node.js: not found"
        all_good=false
    fi

    # Check pnpm
    if command_exists pnpm; then
        print_success "pnpm: v$(pnpm --version)"
    else
        print_error "pnpm: not found"
        all_good=false
    fi

    # Check Go
    if command_exists go; then
        print_success "Go: $(go version | awk '{print $3}')"
    else
        print_error "Go: not found"
        all_good=false
    fi

    # Check libvips
    if command_exists vips; then
        print_success "libvips: $(vips --version | head -n 1)"
    else
        print_error "libvips: not found (required for image uploads)"
        all_good=false
    fi

    # Check prek
    if command_exists prek; then
        print_success "prek: installed"
    else
        print_warning "prek: not found (optional but recommended)"
    fi

    # Check shellcheck
    if command_exists shellcheck; then
        print_success "shellcheck: installed"
    else
        print_warning "shellcheck: not found (optional but recommended)"
    fi

    # Check frontend dependencies
    if [ -d "frontend/node_modules" ]; then
        print_success "Frontend dependencies: installed"
    else
        print_error "Frontend dependencies: not found"
        all_good=false
    fi

    # Check backend dependencies
    if [ -f "backend/go.sum" ]; then
        print_success "Backend dependencies: installed"
    else
        print_error "Backend dependencies: not found"
        all_good=false
    fi

    echo ""
    if [ "$all_good" = true ]; then
        print_success "All core dependencies verified!"
        return 0
    else
        print_error "Some dependencies are missing"
        return 1
    fi
}

# Print next steps
print_next_steps() {
    print_header "DONE"

    echo ""
    echo "Your development environment is ready!"
    echo "Happy coding! 🎉"
    echo ""
}

# Main execution
main() {
    print_header "Provisioning nielsshootsfilm Development Environment"

    echo "This script will install all required dependencies:"
    echo "  • Node.js 24.11.0+ (frontend) - LTS version"
    echo "  • Go 1.25+ (backend)"
    echo "  • libvips 8.x+ (image processing)"
    echo "  • Frontend npm packages"
    echo "  • Backend Go modules"
    echo "  • Pre-commit hooks"
    echo "  • Optional development tools (shellcheck, golangci-lint, jq)"
    echo ""

    read -p "Continue with installation? (Y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
        echo "Installation cancelled"
        exit 0
    fi

    # Detect OS
    detect_os
    print_info "Detected OS: $OS"

    # Run installation steps
    check_homebrew
    install_node
    install_pnpm
    install_go
    install_vips
    install_frontend_deps
    install_backend_deps
    install_precommit
    install_devex_tools

    # Verify everything
    if verify_installation; then
        run_bootstrap
        setup_direnv
        print_next_steps
    else
        print_error "Installation completed with errors"
        print_info "Please review the output above and install missing dependencies"
        exit 1
    fi
}

# Run main function
main
