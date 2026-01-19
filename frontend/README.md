# Frontend - Photography Portfolio

This is the frontend application for the photography portfolio website. It's built as a static site using TypeScript, Lit web components, and Vite.

## Overview

- **Framework**: Vanilla TypeScript with Lit web components (~5KB)
- **Build Tool**: Vite (fast HMR, optimized production builds)
- **Package Manager**: pnpm (fast, disk-efficient)
- **Testing**: Vitest for unit tests
- **Styling**: Vanilla CSS with CSS custom properties

## Quick Start

### Development

```bash
# Install dependencies (uses vendored packages, no network needed)
pnpm install --offline

# Start development server (http://localhost:5173)
pnpm run dev
```

### Production Build

```bash
# Build for production
./scripts/build.sh
```

This creates a `build/` directory with:

- Compiled and minified JavaScript/CSS
- `data/` directory (JSON configuration)
- `static/` directory (uploaded images)

See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for deployment instructions.

## Available Scripts

### Development Commands

- `pnpm run dev` - Start dev server with HMR
- `pnpm run preview` - Preview production build locally

### Build Commands

- `pnpm run build` - TypeScript compile + Vite build
- `./scripts/build.sh` - Production build with data/static directories

### Test Commands

- `pnpm test` - Run all tests once
- `pnpm run test:watch` - Run tests in watch mode
- `pnpm run test:ui` - Open Vitest UI
- `pnpm run test:ci` - Run tests for CI (no watch mode)

### Code Quality Commands

- `pnpm run lint` - Lint TypeScript files
- `pnpm run lint:fix` - Lint and auto-fix issues
- `pnpm run format` - Format code with Prettier
- `pnpm run format:check` - Check formatting
- `pnpm run typecheck` - TypeScript type checking

### Script Shortcuts

For convenience, you can also use the scripts in `scripts/`:

- `./scripts/start-frontend.sh` - Start dev server
- `./scripts/build.sh` - Production build
- `./scripts/test.sh` - Run tests once
- `./scripts/test-watch.sh` - Run tests in watch mode
- `./scripts/lint.sh` - Lint code
- `./scripts/format.sh` - Format code
- `./scripts/typecheck.sh` - Type check

## Project Structure

```text
frontend/
├── src/
│   ├── index.html          # Main HTML entry point
│   ├── main.ts             # Application entry point
│   ├── components/         # Lit web components
│   │   ├── app-shell.ts
│   │   ├── app-nav.ts
│   │   ├── album-card.ts
│   │   ├── photo-grid.ts
│   │   └── ...
│   ├── pages/              # Page components
│   │   ├── portfolio-page.ts
│   │   ├── album-list-page.ts
│   │   ├── album-detail-page.ts
│   │   └── admin-*.ts      # Admin pages
│   ├── utils/              # Utilities
│   │   ├── api.ts          # Public API calls
│   │   ├── admin-api.ts    # Admin API calls
│   │   ├── router.ts       # Client-side routing
│   │   └── theme-manager.ts
│   ├── styles/             # Global styles
│   ├── types/              # TypeScript types
│   └── test-setup.ts       # Test configuration
├── scripts/                # Build/dev scripts
├── build/                  # Production build output (generated)
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Key Features

### Public-Facing

- Portfolio page with featured images
- Album list with cover images
- Album detail with photo grid
- Lightbox for full-size viewing
- Responsive design (mobile-first)

### Admin Interface

- Login with bcrypt password hashing
- Album management (create, edit, delete)
- Photo upload with automatic resizing
- Site configuration editor
- Photo reordering with drag-and-drop

## Development Notes

### Data Sources

During development, the frontend expects:

- `/data/site_config.json` - Site metadata
- `/data/albums.json` - Album and photo data
- `/uploads/*` - Uploaded images (served from `../static/uploads/`)

Vite's dev server uses middleware to serve these from the parent directories.

### Building for Production

The production build (`./scripts/build.sh`):

1. Runs TypeScript compiler
2. Bundles with Vite (tree-shaking, minification)
3. Copies `data/` directory
4. Copies `static/` directory
5. Creates `build/` directory ready for deployment

### Path Configuration

All paths are absolute from root (`/data/`, `/uploads/`, `/assets/`) to ensure the site works when served from a domain root (e.g., `nielsshootsfilm.com`).

## Testing Strategy

Tests are written with Vitest and follow these conventions:

- Unit tests for components: `*.test.ts`
- Test files located alongside source files
- Use `@testing-library/dom` for DOM assertions
- Mock fetch calls with Sinon

Run tests with:

```bash
pnpm test
```

## Deployment

The frontend is designed to be deployed as a static site. See [DEPLOYMENT.md](../docs/DEPLOYMENT.md) for complete deployment instructions.

**Key Requirements:**

- Must be served from domain root
- Web server needs SPA fallback (serve `index.html` for all routes)
- Set appropriate cache headers for `/assets/` and `/static/`

## Browser Support

- Modern browsers with ES2020 support
- Safari 14+
- Chrome/Edge 90+
- Firefox 88+

## Vendored Dependencies

All npm packages are vendored in `.pnpm-store/` (committed to git). This enables **hermetic builds** - no npm registry access needed after cloning.

```bash
# Offline install (hermetic, recommended)
pnpm install --offline

# Regular install (prefers offline, falls back to network)
pnpm install
```

**When adding/updating packages:**

```bash
pnpm add <package>                   # Add and populate store
pnpm fetch                           # Ensure store has all lockfile packages
git add .pnpm-store pnpm-lock.yaml   # Commit together
```

**Checking for updates:**

```bash
./scripts/update-deps.sh             # Check for available updates
./scripts/update-deps.sh --update    # Interactively update and re-vendor
```

See `.pnpm-store/README.md` for more details.

## Performance

- Initial bundle: ~133KB (~26KB gzipped)
- Lit components: ~5KB
- No heavy frameworks
- Lazy loading for images
- Code splitting ready (can be added in Phase 8)
