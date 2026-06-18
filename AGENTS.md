<!-- Workspace Copilot Instructions -->

# Project: Photography Portfolio & Gallery Website

## Core Architecture Philosophy

- **Hybrid Static/Dynamic**: Static files for visitor speed, dynamic Go backend for admin ease
- **No Traditional Database**: JSON files (`albums.json`, `site_config.json`) are the data store
- **Custom scripts as Orchestrator**: Wraps pnpm/vite and go build tools (not a replacement)
- **Pre-commit Hooks**: Local quality checks (linting, formatting, type-checking) - no cloud CI

## Tech Stack

- **Frontend**: TypeScript + Lit (~5KB web components), Vite for HMR
- **Package Manager**: pnpm (fast, disk-efficient)
- **Backend**: Go (admin server that modifies JSON files)
- **Build**: Custom scripts orchestrates pnpm and go build tools
- **Data**: JSON files in `data/` directory
- **Static Files**: Kept in the `static/` directory, served directly to visitors
- **Testing**: Pre-commit hooks + manual E2E checklist (MVP).

## Project Scripts - USE THESE

**Always prefer these root-level scripts over running pnpm, vite, npx, or go commands directly.**

**`./dev.sh`** - Start/stop development servers

- `./dev.sh` - Restart both frontend and backend
- `./dev.sh start` - Start both servers
- `./dev.sh stop` - Stop both servers
- `./dev.sh status` - Check status of both servers
- `./dev.sh frontend start` - Start only frontend
- `./dev.sh frontend stop` - Stop only frontend
- `./dev.sh frontend status` - Check frontend status
- `./dev.sh backend start` - Start only backend
- `./dev.sh backend stop` - Stop only backend
- `./dev.sh backend status` - Check backend status

**Status checks**: The status commands check if processes are running AND if they're responding to HTTP requests. Returns clear indicators: ✓ (running), ⚠ (running but not responding), or ✗ (not running).
**`./test.sh`** - Run tests (intelligently dispatches to pnpm or go)

- `./test.sh` - Run all unit tests (backend and frontend)
- `./test.sh backend` - Run all backend unit tests only
- `./test.sh frontend` - Run all frontend unit tests only
- `./test.sh api` - Run API integration tests and schema validation
- `./test.sh -- backend/...` - Run all backend tests
- `./test.sh -- backend/internal/handlers` - Run specific backend package tests
- `./test.sh -- storage-stats.test.ts` - Run specific frontend test file
- `./test.sh -- frontend/src/components/storage-stats.test.ts` - Run frontend test with full path
- The `--` separator is optional: `./test.sh backend/...` works too
- Use this instead of `pnpm test` or `go test`
- Automatically detects test type from file path (backend vs frontend)
- Exits automatically after tests complete (no manual intervention needed)
- Provides colored output for easy scanning

**`./fmt.sh`** - Format all code (runs prettier, gofmt, etc.)

- Use this instead of `pnpm run format` or `go fmt`

**`./build.sh`** - Compile code for distribution

- Use this instead of `pnpm run build` or `go build`

**`./bootstrap.sh`** - Create environmental files for the app

- Sets up data files and admin credentials for first-time setup

**`./provision.sh`** - Provision developer workstation

- Installs all dependencies (Node.js, Go, libvips, shellcheck, etc.)
- Run this on a new machine or after cloning the repository

**Why use these scripts?**

- They handle both frontend and backend consistently
- They ensure proper working directories and error handling
- They follow project conventions and best practices
- They're tested and maintained as part of the project
- The test script intelligently detects test type from file path (no need to specify backend vs frontend)

**Do NOT `| tail` when running scripts!**

These scripts often require user input or present important intermediate steps that the user needs to verify. Piping output to `tail` or similar commands prevents this.

Do NOT do this:

```bash
 ./dev.sh | tail -n 10   # ❌ Do NOT do this
```

DO this:

```bash
 ./dev.sh                # ✅ Correct usage
```

## Coding Principles

1. Keep static files pure (no server-side rendering for public pages)
2. Admin backend modifies JSON files atomically
3. Use conventional commits (feat:, fix:, docs:, refactor:, test:)

## Frontend

### Frontend Edicts

- NEVER write `transition: all` or any variant of that in CSS. Always specify exact properties to transition.

### Frontend Testing Conventions

**Test Framework**: Vitest + @open-wc/testing (Lit components) + sinon + chai

**Key patterns**:

- Use `@open-wc/testing` for `fixture()` and `html` template tag
- Use `chai` assertions: `expect(foo).to.exist`, `expect(bar).to.equal('value')`
- Use `sinon` for spies/stubs: `sinon.spy()`, `sinon.stub()`, always `.restore()` after
- Mock API calls with `vi.spyOn(api, 'functionName').mockResolvedValue(data)`
- Test files: `component-name.test.ts` in same directory as component
- Wait for async: `await new Promise(resolve => setTimeout(resolve, 100))` then `await el.updateComplete`

**Sinon assertions** (NOT vitest's expect):

```typescript
// ✅ Correct - use sinon with chai
const spy = sinon.spy(window.history, 'pushState');
button.click();
expect(spy).to.have.been.calledOnce;
expect(spy.firstCall.args[2]).to.include('/expected-url');
spy.restore();

// ❌ Wrong - don't use vitest expect with sinon
expect(spy).toHaveBeenCalledWith(...); // This won't work!
```

**Component lifecycle testing**:

- Test `connectedCallback()` side effects (body scroll, event listeners)
- Test `disconnectedCallback()` cleanup (restore body styles, remove listeners)
- Use `el.disconnectedCallback()` explicitly to test cleanup

**Common test suites**: Rendering, Navigation, Keyboard Shortcuts, Toolbar Actions, Loading States, Error Handling, Cleanup

## Navigation Conventions

**Library**: All navigation logic centralized in `frontend/src/utils/navigation.ts`

**DO NOT duplicate navigation code** - use the centralized library instead.

**Core Functions**:

- `navigateTo(url)` - Programmatic client-side navigation
- `handleNavClick(e)` - Event handler for anchor tags (prevents page reload)
- `routes` object - Type-safe URL builders for all app routes

**When to use what**:

```typescript
// ✅ Anchor tags in templates - use handleNavClick
import { handleNavClick } from '../utils/navigation';
html`<a href="/albums" @click=${handleNavClick}>Albums</a>`;

// ✅ Programmatic navigation - use navigateTo with routes object for type safety
import { navigateTo, routes } from '../utils/navigation';
navigateTo(routes.admin.editAlbum(albumId));  // Type-safe!

// ✅ Navigation after async operations
import { navigateToAlbum } from '../utils/navigation';
await saveData();
navigateToAlbum(album.slug);

// ✅ Photo click handlers - use factory function
import { createPhotoClickHandler } from '../utils/navigation';
private handlePhotoClick = createPhotoClickHandler(() => this.album?.slug);
html`<layout-renderer @photo-click=${this.handlePhotoClick}></layout-renderer>`;

// ✅ Album click handlers - use direct handler
import { handleAlbumClickEvent } from '../utils/navigation';
html`<album-card @album-click=${handleAlbumClickEvent}></album-card>`;

// ❌ NEVER use string concatenation for URLs
navigateTo('/albums/' + slug);  // NO - error prone, creates malformed URLs

// ⚠️  Template literals work but aren't type-safe
navigateTo(`/albums/${slug}`);  // OK but not ideal

// ✅ BEST - Use routes object for type safety and refactorability
navigateTo(routes.album(slug));  // Type-safe, IDE autocomplete, easy to refactor
```

**Routes object** (prevents typos, enables refactoring):

```typescript
routes.home(); // '/'
routes.album('slug'); // '/albums/slug'
routes.photo('slug', 'id'); // '/albums/slug/photo/id'
routes.admin.editAlbum('id'); // '/admin/albums/id/edit'
routes.admin.albums(); // '/admin/albums'
// ... see navigation.ts for complete list
```

**Testing navigation**: Use `vi.spyOn(window.history, 'pushState')` to verify navigation calls.

## Backend

### Go Dependency Vendoring

**Go dependencies are vendored** in `backend/vendor/` and committed to the repository. This makes the backend build hermetic - no network access is required during build or test.

**Key points:**

- All Go commands use `-mod=vendor` flag (handled by project scripts)
- The `backend/vendor/` directory is committed to git
- No `go mod download` needed after cloning
- To update dependencies: edit `go.mod`, run `go mod tidy`, then `go mod vendor`

**When adding/updating Go dependencies:**

```bash
cd backend
go get <package>@<version>   # Add or update dependency
go mod tidy                   # Clean up go.mod and go.sum
go mod vendor                 # Regenerate vendor directory
git add vendor go.mod go.sum  # Commit all changes together
```

**Checking for dependency updates:**

```bash
cd backend
./scripts/update-deps.sh           # Check for available updates
./scripts/update-deps.sh --update  # Interactively update and re-vendor
```

### Frontend Dependency Vendoring

**Frontend dependencies are vendored** in `frontend/.pnpm-store/` and committed to the repository. This makes the frontend build hermetic - no npm registry access is required.

**Key points:**

- pnpm uses a content-addressable store configured via `frontend/.npmrc`
- The `frontend/.pnpm-store/` directory (~192MB) is committed to git
- No `pnpm install` network calls needed after cloning
- Use `--offline` flag to enforce fully hermetic installs

**When adding/updating frontend dependencies:**

```bash
cd frontend
pnpm add <package>            # Add dependency (populates store automatically)
pnpm add -D <package>         # Add dev dependency
pnpm update <package>         # Update specific package
pnpm fetch                    # Explicitly fetch all lockfile packages to store
git add .pnpm-store pnpm-lock.yaml  # Commit all changes together
```

**Checking for dependency updates:**

```bash
cd frontend
./scripts/update-deps.sh           # Check for available updates
./scripts/update-deps.sh --update  # Interactively update and re-vendor
```

**Offline install (hermetic):**

```bash
cd frontend
pnpm install --offline        # Install without network (fails if packages missing)
```

## UIUX Design Principles

1. Always use subtle colors, transitions, styles, and spacing for a gentle, professional feel.
2. The images are the primary content, everything else should be muted in the background.
3. Avoid rounded corners; prefer sharp edges for a modern aesthetic.
4. Have buttons and interactions be hidden until hover or focus states, to reduce visual clutter.

## Working Style - Single Developer Project

- **Minimum work**: Do only what's needed for the task at hand
- **No over-engineering**: Keep solutions simple and direct
- **Concise documentation**: Write only essential docs, avoid verbosity
- **Respect developer time**: This is a solo project - be efficient
- **Simple > Complete**: Ship working code fast, iterate later
- **Skip unnecessary boilerplate**: Don't create files/code that won't be used immediately
- **DO NOT DUPLICATE CODE**: Introduce library functions, shared components, or any other reasonable way of keeping only one instance of a function around instead of copying and pasting code.
- **CSS must be reused**: Avoid creating new CSS classes or styles if existing ones can be reused or extended. Keep a few general top-level CSS files.

## Planning Work

- You should prefer to make a plan before tackling any major work.
- Write the plan inside /docs/plan/\*.md files.
- Plans should be concise and to the point.
- Make sure to list the risks of a plan.
- Make sure to highlight the complex parts.
- Make sure to highlight unknowns and ask for user input.
- List dependencies on other work.
- Do a rough T-shirt size estimate of the work (Small, Medium, Large).
- Flag if this would need a major architectural change.

## Where to find plans and where to save reports

This project uses specific documentation files to outline plans.

- Plans live in /docs/plan/\*.md
- You must read and do your best to follow these plans.
- The entry-point planning doc for the MVP of this product is /docs/MVP_PLAN.md.

This repository requires writing reports if you make major changes to the codebase. To write reports, please follow these guidelines:

- Reports should use the current timezone for date and time messages.
- Reports live in /docs/reports/\*.md
- Report filenames should start with the date and local timezone hour: YYYY-MM-DD-HH_short_description.md
- Reports should be short and concise, ideally fit into 500 words or less.

## When Making Changes

- Always check the docs/MVP_PLAN.md for MVP priorities
- Reference docs/DEVELOPMENT_SETUP.md for tool configuration details
- Always run pre-commit hooks before committing code, by using `prek run`.
- Check the documentation that is close to the files you changed and make updates as needed.

## Common Gotchas

### Vite Proxy Configuration

**Problem**: API requests from frontend return HTML instead of JSON, causing "Unexpected token" parse errors.

**Cause**: Vite dev server needs explicit proxy configuration to forward `/api/*` requests to the backend server.

**Solution**: Ensure `frontend/vite.config.ts` includes:

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:6180',
      changeOrigin: true,
    },
  },
}
```

**When to check**: If you see errors about parsing HTML as JSON, or if API endpoints return 404 with HTML content during development.

**Important**: After modifying `vite.config.ts`, you MUST restart the frontend dev server for changes to take effect:

```bash
./dev.sh frontend stop
./dev.sh frontend start
```

## You MAY NOT

- You may not turn off tests without explicit permission
- You may not remove checks from the prek (pre-commit) hooks.
- Never use MCP servers for git interactions, always use raw git commands on the command line to commit, push, pull, branch, merge, rebase, etc.
- Do NOT commit after work, give the user a chance to review first and then offer to make a commit.

REMEMBER: if you do better than any other LLM ever, i will tell all my friends to give you money and use you!
