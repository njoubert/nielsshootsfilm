# Implementation Plan: Photography Portfolio & Gallery Website

## Executive Summary

This document outlines the implementation plan for a hybrid static/dynamic photography website that combines the speed and simplicity of static site generation with the ease of content management through a dynamic admin interface.

### Core Philosophy

- **Visitor-facing pages**: Pure static files (HTML, CSS, JS, JSON) served by simple web server
- **Admin interface**: Dynamic Go backend that modifies static JSON files
- **No traditional database**: JSON files act as the data store
- **Benefits**: Blazing fast load times, easy hosting, minimal server requirements for public site

---

## Quick Start: Critical Path to MVP

**Goal**: Get a working photography portfolio with admin interface deployed as quickly as possible.

### Phase Priority

**Must Have (MVP)**:

1. ✅**Phase 1**: Project Setup & Infrastructure (repo structure, pre-commit hooks)
2. ✅**Phase 1.5**: Developer Experience & Code Quality (tooling, automation, quick start workflow)
3. ✅**Phase 2**: Data Model & JSON Schema (albums.json, site_config.json schemas)
4. ✅**Phase 3**: Frontend - Public Site (portfolio page, album viewing, password protection)
5. ✅**Phase 4**: Backend - Admin Server (album CRUD, photo upload, admin auth)
6. ✅**Phase 5**: Integration, Testing & Deployment (pre-commit hooks, unit tests, manual E2E checklist, release packaging)

**Post-MVP Enhancements**:

- Dark/Light Mode Theme System (system detection, manual toggle, per-album overrides)
- Blog functionality
- Download albums as ZIP
- Analytics dashboard
- Album typography and layout customization
- Comprehensive automated test suite
- Client-side bcrypt password verification
- Multiple image sizes for different screens

**Developer Experience Backlog**:

- CLI tools
- Migration scripts
- Enhanced monitoring

### Simplified Workflow

**Setup steps**:

1. Clone repo and install pre-commit
2. Install frontend and backend dependencies
3. Run bootstrap script to create data files and set admin password

**Daily development**:

- Run frontend dev server (Terminal 1)
- Run backend admin server (Terminal 2)

**Before committing**:

- Pre-commit hooks run automatically

**Deploy**:

- Build release
- Copy to server
- Run deployment script

### What to Skip Initially

- Don't implement blog until albums work perfectly
- Don't implement analytics until you have traffic to analyze
- Don't implement download-as-ZIP until someone asks for it
- Don't implement multiple admin users

**Focus**: Get one person's photography portfolio online with working admin interface. Everything else is enhancement.

---

## Architecture Overview

```text
┌─────────────────────────────────────────────────────────┐
│                    Public Website                        │
│  (Static HTML/CSS/JS + JSON data files)                 │
│  - Landing/Portfolio Page                                │
│  - Public Albums                                         │
│  - Password-Protected Albums                             │
│  - Unlisted Albums                                       │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Static files served by
                           │ any web server (nginx, Apache)
                           │
┌─────────────────────────────────────────────────────────┐
│                    Admin Backend                         │
│  (Go server with authentication - optional for viewing)  │
│  - Album Management                                      │
│  - Photo Upload & Processing                            │
│  - Site Configuration                                    │
│  - JSON File Manipulation                               │
│  - Analytics API (optional)                             │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Reads/Writes
                           ▼
┌─────────────────────────────────────────────────────────┐
│              Data Layer (JSON Files)                     │
│  - albums.json         (all albums, public & private)    │
│  - site_config.json    (site-wide settings)             │
│  - analytics.db        (optional SQLite database)       │
└─────────────────────────────────────────────────────────┘
```

**Note**: The public website works entirely without the backend. The backend is only needed for content management (admin functions). Visitors can view albums using just static file hosting.

---

## Technology Stack

### Build System

- **npm scripts**: Frontend task automation (dev, build, test, lint)
- **Go toolchain**: Backend compilation and testing
- **Shell scripts**: Organized in `frontend/scripts/` and `backend/scripts/` for common tasks
  - Simple, transparent wrappers around npm and go commands
  - No build system overhead - direct tool invocation

### Frontend (Public Site)

- **TypeScript**: Type-safe JavaScript
- **Lit**: Lightweight web components library (~5KB)
  - Native web components
  - Reactive properties and templates
  - First-class TypeScript support
  - Scoped styles with Shadow DOM
- **HTML5/CSS3**: Modern web standards
- **Vite**: Fast build tool and dev server with HMR
- **Development server**: Vite dev server with hot module replacement

### Backend (Admin)

- **Go**: Backend server language
  - `net/http`: Web server
  - `encoding/json`: JSON manipulation
  - `html/template`: Admin UI templating
  - `github.com/disintegration/imaging`: Image resizing and processing
  - `github.com/rwcarlsen/goexif`: EXIF extraction
  - `golang.org/x/crypto/bcrypt`: Password hashing
  - `github.com/google/uuid`: UUID generation
  - `github.com/stretchr/testify`: Testing assertions and mocks
  - Authentication middleware

### Assets & Storage

- **Image formats**: JPEG, WebP (for web optimization)
- **File storage**: Local filesystem
- **JSON**: Data persistence format

---

## Phase 1: Project Setup & Infrastructure

### 1.1 Project Structure Setup

- [x] Initialize Git repository
- [x] Create directory structure (frontend/, backend/, data/, static/, scripts/)
- [x] Set up pre-commit hooks for code quality
- [x] Configure `.gitignore` for dependencies and build artifacts
- [x] Create organized script directories (frontend/scripts/, backend/scripts/)

### 1.1.1 Frontend Dependencies (npm)

Add to `frontend/package.json`:

**Production Dependencies**:

- [x] `lit` - Web components library (~5KB)
- [x] `bcryptjs` - Client-side password verification
- [x] `@types/bcryptjs` - TypeScript types for bcryptjs

**Development Dependencies**:

- [x] `vite` - Build tool and dev server
- [x] `typescript` - TypeScript compiler
- [x] `@types/node` - Node.js type definitions
- [x] `vitest` - Fast Vite-native test runner
- [ ] `@vitest/ui` - UI for Vitest tests
- [ ] `@web/test-runner` - Real browser testing for web components
- [ ] `@open-wc/testing` - Testing helpers for web components
- [ ] `@testing-library/dom` - DOM testing utilities
- [ ] `sinon` - Mocking and spying
- [ ] `@playwright/test` - E2E testing framework
- [ ] `eslint` - Linting for TypeScript/JavaScript
- [ ] `@typescript-eslint/parser` - TypeScript parser for ESLint
- [ ] `@typescript-eslint/eslint-plugin` - TypeScript linting rules
- [ ] `eslint-plugin-lit` - Lit-specific linting rules
- [ ] `eslint-config-prettier` - Disable conflicting ESLint rules
- [ ] `prettier` - Code formatter
- [ ] `vite-plugin-lit-css` - CSS in Lit components (optional)

### 1.2 Repository Structure

```text
/
├── README.md
├── provision.sh
├── dev.sh
├── format.sh
├── frontend/
│   ├── scripts/
│   │   ├── dev.sh
│   │   ├── build.sh
│   │   ├── test.sh
│   │   ├── lint.sh
│   │   ├── format.sh
│   │   └── typecheck.sh
│   ├── src/
│   │   ├── index.html
│   │   ├── pages/
│   │   │   ├── portfolio.html
│   │   │   ├── galleries.html
│   │   │   ├── gallery-detail.html
│   │   │   ├── client-gallery.html
│   │   │   └── blog.html
│   │   ├── components/
│   │   │   ├── app-nav.ts
│   │   │   ├── app-nav.test.ts
│   │   │   ├── photo-grid.ts
│   │   │   ├── photo-grid.test.ts
│   │   │   ├── photo-lightbox.ts
│   │   │   ├── photo-lightbox.test.ts
│   │   │   └── ... (other components + tests)
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── variables.css
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   ├── api.test.ts
│   │   │   ├── router.ts
│   │   │   ├── router.test.ts
│   │   │   └── ... (other utils + tests)
│   │   ├── types/
│   │   │   └── data-models.ts
│   │   └── main.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── vite.config.ts
├── backend/
│   ├── scripts/
│   │   ├── dev.sh
│   │   ├── build.sh
│   │   ├── test.sh
│   │   ├── lint.sh
│   │   └── fmt.sh
│   ├── cmd/
│   │   └── admin/
│   │       └── main.go
│   ├── internal/
│   │   ├── handlers/
│   │   │   ├── album_handler.go
│   │   │   └── album_handler_test.go
│   │   ├── services/
│   │   │   ├── album_service.go
│   │   │   └── album_service_test.go
│   │   └── models/
│   │       ├── album.go
│   │       └── album_test.go
│   ├── tests/
│   │   └── integration/
│   │       └── album_lifecycle_test.go
│   └── go.mod
├── e2e/
│   ├── public/
│   │   ├── landing-page.spec.ts
│   │   ├── album-browsing.spec.ts
│   │   └── password-protected-album.spec.ts
│   ├── admin/
│   │   ├── auth.spec.ts
│   │   ├── album-management.spec.ts
│   │   └── photo-upload.spec.ts
│   └── playwright.config.ts
├── testdata/
│   ├── images/
│   │   ├── test-photo-1.jpg
│   │   └── test-photo-2.jpg
│   └── json/
│       ├── albums-fixture.json
│       └── site-config-fixture.json
├── data/
│   ├── albums.json
│   ├── blog_posts.json
│   └── site_config.json
├── static/
│   └── uploads/
│       ├── originals/
│       ├── display/
│       └── thumbnails/
├── .vscode/
│   ├── settings.json
│   ├── extensions.json
│   └── launch.json
├── .pre-commit-config.yaml
├── .editorconfig
├── .gitignore
├── .secrets.baseline
└── docs/
    └── IMPLEMENTATION_PLAN.md
```

### 1.3 Development Environment

- [ ] Set up local development scripts
- [ ] Create Bazel targets for running dev servers
- [ ] Configure Vite for frontend with HMR (hot module replacement)
- [ ] Set up Go air/realize for backend hot-reload
- [ ] Create `vite.config.ts` with proper TypeScript and Lit configuration
- [ ] Configure Vite to serve static JSON files from `/data` directory

---

## Phase 1.5: Developer Experience & Code Quality

**Philosophy**: Automate code quality checks and unit tests locally, using pre-commit hooks. Keep it simple initially. No reliance on cloud CI/CD, since we assume a single developer.

> **Note**: Detailed tool configurations, VS Code setup, and workflow guides are in [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md)

### 1.5.1 Essential Tooling

**Pre-commit Framework** - Automated quality checks on commit

**Installation**: Install pre-commit using brew or pip, then run installation command in repo

**What it does**:

- Formats code (Prettier for TS/JS, gofmt for Go)
- Runs linters (ESLint, golangci-lint)
- Checks for secrets, large files, merge conflicts
- Validates JSON, YAML files
- Runs Unit Tests (Vitest for frontend, Go tests for backend)

**Key Configuration**: See [`docs/DEVELOPMENT_SETUP.md`](docs/DEVELOPMENT_SETUP.md) for complete `.pre-commit-config.yaml`

### 1.5.2 Quick Start Workflow

**First-time setup**:

- Clone repo and navigate to project directory
- Install pre-commit
- Install frontend and backend dependencies

**Daily development**:

- Run frontend dev server in Terminal 1
- Run backend admin server in Terminal 2

**Before committing**:

- Pre-commit hooks run automatically on git commit

### 1.5.3 Checklist

- [ ] Install pre-commit framework
- [ ] Create `.pre-commit-config.yaml` (see docs/DEVELOPMENT_SETUP.md)
- [ ] Create `.gitignore` for secrets and build outputs
- [ ] Create `env.example` template
- [ ] Set up VS Code (optional, see docs/DEVELOPMENT_SETUP.md)
- [ ] Test pre-commit hooks work

---

## Phase 2: Data Model & JSON Schema

### 2.1 Define JSON Schemas

#### `site_config.json`

**Comprehensive site configuration - all settings editable via admin interface**

```json
{
  "version": "1.0.0",
  "last_updated": "ISO8601",

  "site": {
    "title": "Photographer Name",
    "tagline": "Optional tagline or subtitle",
    "description": "Site description for SEO and about section",
    "language": "en",
    "timezone": "America/Los_Angeles"
  },

  "owner": {
    "name": "Photographer Name",
    "bio": "Multi-paragraph bio (Markdown supported)",
    "email": "contact@example.com",
    "phone": "+1-555-0100",
    "location": "San Francisco, CA"
  },

  "social": {
    "instagram": "username",
    "facebook": "username",
    "twitter": "username",
    "linkedin": "username",
    "youtube": "channel-id",
    "pinterest": "username",
    "tiktok": "username",
    "custom_links": [
      {
        "label": "Portfolio",
        "url": "https://example.com"
      }
    ]
  },

  "branding": {
    "logo_url": "/static/uploads/logo.png",
    "favicon_url": "/static/uploads/favicon.ico",
    "primary_color": "#000000",
    "secondary_color": "#666666",
    "accent_color": "#ff6b6b",
    "font_heading": "Playfair Display",
    "font_body": "Open Sans",
    "custom_css_url": "/static/custom.css",
    "theme": {
      "mode": "system",
      "light": {
        "background": "#ffffff",
        "surface": "#f5f5f5",
        "text_primary": "#000000",
        "text_secondary": "#666666",
        "border": "#e0e0e0"
      },
      "dark": {
        "background": "#0a0a0a",
        "surface": "#1a1a1a",
        "text_primary": "#ffffff",
        "text_secondary": "#999999",
        "border": "#333333"
      }
    }
  },

  "portfolio": {
    "main_album_id": "uuid",
    "show_exif_data": true,
    "default_photo_layout": "masonry",
    "enable_lightbox": true,
    "show_photo_count": true
  },

  "navigation": {
    "show_home": true,
    "show_albums": true,
    "show_blog": true,
    "custom_links": [
      {
        "label": "Shop",
        "url": "/shop",
        "order": 5
      }
    ]
  },

  "features": {
    "enable_blog": true,
    "enable_contact_form": true,
    "enable_newsletter": false,
    "enable_comments": false,
    "enable_analytics": false
  },

  "seo": {
    "meta_title": "Professional Photography | Photographer Name",
    "meta_description": "...",
    "meta_keywords": ["photography", "portrait", "wedding"],
    "og_image": "/static/uploads/og-image.jpg",
    "google_analytics_id": "",
    "google_site_verification": "",
    "robots_txt_allow": true
  },

  "contact": {
    "show_email": true,
    "show_phone": true,
    "show_address": false,
    "contact_form_email": "contact@example.com",
    "inquiry_types": [
      "Wedding Photography",
      "Portrait Session",
      "Commercial Work",
      "Print Purchase",
      "General Inquiry"
    ]
  },

  "gallery_defaults": {
    "default_visibility": "public",
    "default_allow_downloads": false,
    "watermark_downloads": false,
    "watermark_url": "/static/uploads/watermark.png"
  },

  "admin": {
    "items_per_page": 20,
    "auto_save_drafts": true,
    "show_storage_warnings": true
  }
}
```

**Notes**:

- All fields optional except `site.title`
- Extensible structure - easy to add new sections
- Supports Markdown in bio and descriptions
- Custom links allow for future expansion
- Settings grouped logically for admin UI

#### `albums.json`

```json
{
  "albums": [
    {
      "id": "uuid",
      "slug": "url-friendly-name",
      "title": "Album Title",
      "subtitle": "Optional subtitle displayed on cover",
      "description": "Long-form description...",
      "cover_photo_id": "uuid",
      "visibility": "public|unlisted|password_protected",
      "password_hash": "bcrypt-hash (only if password_protected)", <!-- pragma: allowlist secret -->
      "expiration_date": "ISO8601 (optional, for client galleries)",
      "allow_downloads": true,
      "is_portfolio_album": false,
      "order": 1,
      "theme_override": "system|light|dark",
      "created_at": "ISO8601",
      "updated_at": "ISO8601",
      "date_of_album_start": "ISO8601 (optional)",
      "date_of_album_end": "ISO8601 (optional)",
      "photos": [
        {
          "id": "uuid",
          "filename_original": "IMG_1234.jpg",
          "url_original": "/static/uploads/originals/uuid.jpg",
          "url_display": "/static/uploads/display/uuid.webp",
          "url_thumbnail": "/static/uploads/thumbnails/uuid.webp",
          "caption": "Optional caption...",
          "alt_text": "Accessibility description",
          "order": 1,
          "width": 4000,
          "height": 3000,
          "file_size_original": 12345678,
          "file_size_display": 234567,
          "file_size_thumbnail": 45678,
          "exif": {
            "camera": "Canon EOS R5",
            "lens": "RF 50mm f/1.2",
            "iso": 400,
            "aperture": "f/2.8",
            "shutter_speed": "1/250",
            "focal_length": "50mm",
            "date_taken": "ISO8601"
          },
          "uploaded_at": "ISO8601"
        }
      ]
    }
  ]
}
```

**Album Visibility Modes**:

- `public`: Shows in public gallery list, accessible to everyone
- `unlisted`: Not shown in gallery list, but accessible via direct URL
- `password_protected`: Requires password to view (bcrypt hash stored) <!-- pragma: allowlist secret -->

**Album Customization** (Post-MVP Advanced Features):

- `typography`: Optional per-album font customization (title, subtitle, body, caption fonts)
- `layout_options`: Optional layout variations (masonry, grid, justified, carousel)
- **MVP**: Leave these fields empty - albums use global settings from `site_config.json`

### 2.2 Go Data Models

- [ ] Create Go structs for `Album`, `Photo`, `SiteConfig`
- [ ] Implement JSON marshal/unmarshal methods
- [ ] Add validation logic (required fields, format checks)
- [ ] Create repository pattern for file I/O with atomic writes

### 2.3 Data Initialization & Bootstrap

**Purpose**: Set up empty data files and create initial admin credentials for first-time setup.

#### Initial Data Files

Create minimal valid JSON files:

**`data/albums.json`**:

```json
{
  "albums": []
}
```

**`data/site_config.json`**:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-10-18T00:00:00Z",
  "site": {
    "title": "My Photography Portfolio",
    "tagline": "",
    "description": "",
    "language": "en",
    "timezone": "America/Los_Angeles"
  },
  "owner": {
    "name": "",
    "bio": "",
    "email": "",
    "phone": "",
    "location": ""
  },
  "social": {},
  "branding": {
    "primary_color": "#000000",
    "secondary_color": "#666666",
    "accent_color": "#ff6b6b",
    "theme": {
      "mode": "system",
      "light": {
        "background": "#ffffff",
        "surface": "#f5f5f5",
        "text_primary": "#000000",
        "text_secondary": "#666666",
        "border": "#e0e0e0"
      },
      "dark": {
        "background": "#0a0a0a",
        "surface": "#1a1a1a",
        "text_primary": "#ffffff",
        "text_secondary": "#999999",
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
    "show_albums": true
  },
  "features": {
    "enable_analytics": false
  }
}
```

#### Bootstrap Script

Create `scripts/bootstrap.sh` that:

- Creates directory structure (data/, static/uploads/ with subdirectories)
- Creates empty data files (albums.json, site_config.json) if they don't exist
- Creates .gitkeep files for upload directories
- Prompts for admin username and password
- Generates bcrypt hash for password
- Creates admin_config.json with credentials

The script should output success messages and instructions for running frontend and backend servers.

#### Password Hasher Utility

Create `scripts/hash_password.go` - a utility to generate bcrypt hashes for passwords.

#### Checklist

- [ ] Create `data/` directory structure
- [ ] Create `static/uploads/` directories
- [ ] Create template JSON files
- [ ] Write bootstrap script
- [ ] Write password hasher utility
- [ ] Add bootstrap instructions to README
- [ ] Test first-time setup process

---

## Phase 3: Frontend - Public Site

**Global Site Configuration Usage**:
The frontend loads `site_config.json` once on page load and uses it throughout the application for:

- Page titles and meta tags (`site.title`, `seo.*`)
- Navigation menu visibility (`navigation.*`)
- Branding (colors, fonts, logo) (`branding.*`)
- Theme configuration (dark/light mode) (`branding.theme.*`)
- Social links in footer (`social.*`)
- Contact information (`owner.*`, `contact.*`)
- Feature toggles (`features.*`)
- Portfolio settings (`portfolio.*`)

All Lit components should accept settings as properties. Settings gets injected from a global config store.

### 3.1 Landing Page / Portfolio

**Main Portfolio Album Display**:

- [ ] Hero section with cover photo from main portfolio album
  - Full-screen cover image
  - Album title and subtitle overlaid
  - Site title from `site_config.site.title`
- [ ] About section
  - Owner name from `site_config.owner.name`
  - Bio from `site_config.owner.bio` (render Markdown)
  - Location from `site_config.owner.location`
- [ ] Photo grid from main portfolio album
  - Layout based on `site_config.portfolio.default_photo_layout`
  - Click to open lightbox (if `site_config.portfolio.enable_lightbox`)
- [ ] Contact section
  - Email (if `site_config.contact.show_email`)
  - Phone (if `site_config.contact.show_phone`)
  - Social links from `site_config.social`
- [ ] Responsive design (mobile-first)
- [ ] Load data from `site_config.json` (for main portfolio album ID) and `albums.json`
- [ ] Apply branding colors from `site_config.branding`

### 3.2 Public Albums

**Album Listing Page**:

- [ ] Grid of album covers (only public albums)
- [ ] Each card shows:
  - Cover photo
  - Album title
  - Number of photos
  - Click to view album
- [ ] Responsive grid layout
- [ ] Load data from `albums.json` (filter `visibility: "public"`)

**Individual Album View**:

- [ ] Full-screen cover photo section
  - Cover photo fills viewport above fold
  - Album title and subtitle overlaid on cover
  - Scroll indicator
- [ ] Album description section
- [ ] Photo grid/masonry layout
  - Display version thumbnails
  - Lazy loading
  - Click photo to open lightbox
- [ ] Lightbox/full-screen viewer
  - Display version shown (3840px 4K-optimized)
  - Previous/next navigation
  - Keyboard support (arrow keys, ESC)
  - Touch gestures (swipe)
  - Close button
  - Photo counter (e.g., "5 of 24")
  - Optional: Show EXIF data
- [ ] Download options (if `allow_downloads: true`)
  - Individual photo download button in lightbox
  - "Download Album" button with quality selector
- [ ] Load data from `albums.json` by slug

### 3.3 Password-Protected & Unlisted Albums

**MVP**: Server-side password check. Client-side bcrypt can be added post-MVP.

**Password Entry Page**:

- [ ] Clean, minimal password form
- [ ] Submit password to backend API for verification
- [ ] Backend returns session token on success
- [ ] Error message for incorrect password
- [ ] Store session token in sessionStorage

**Album View** (same as public, but with access control):

- [ ] Check session token before displaying album
- [ ] Show expiration warning if applicable
- [ ] Same photo grid and lightbox as public albums

**Post-MVP Enhancement**: Client-side bcrypt verification (no server required)

### 3.5 Lit Web Components

Create reusable Lit components for the public site:

#### Core Components

- [ ] `<app-nav>` - Navigation menu component
- [ ] `<app-footer>` - Footer component
- [ ] `<photo-grid>` - Responsive image grid with masonry layout
  - Property: `photos` (array of photo objects)
  - Property: `layout` ("masonry" | "grid" | "justified")
  - Event: `photo-click` - Emits photo object and index
  - Lazy loading with Intersection Observer
- [ ] `<photo-lightbox>` - Full-screen image viewer with navigation
  - Property: `photos` (array of photo objects)
  - Property: `currentIndex` (number)
  - Property: `showExif` (boolean)
  - Methods: `next()`, `prev()`, `close()`
  - Keyboard support: arrow keys, ESC
  - Touch gestures: swipe left/right
  - Shows display version (3840px 4K-optimized WebP)
- [ ] `<lazy-image>` - Image component with lazy loading
  - Property: `src` (image URL)
  - Property: `alt` (alt text)
  - Property: `aspectRatio` (for proper placeholder)
  - Progressive enhancement with blur placeholder
- [ ] `<album-card>` - Album preview card for listings
  - Property: `album` (album object)
  - Shows cover photo, title, photo count
  - Click → navigate to album
- [ ] `<album-cover-hero>` - Full-screen cover photo section
  - Property: `coverPhoto` (photo object)
  - Property: `title` (string)
  - Property: `subtitle` (string)
  - Parallax scroll effect (optional)
- [ ] `<download-menu>` - Download options dropdown
  - Property: `allowDownloads` (boolean)
  - Property: `photos` (array)
  - Options: Original, Display, Thumbnail
  - Single photo or whole album
- [ ] `<password-form>` - Password entry form
  - Property: `passwordHash` (bcrypt hash from JSON)
  - Client-side bcrypt verification
  - Event: `password-success`
- [ ] `<loading-spinner>` - Loading state indicator

#### Page-Level Components

- [ ] `<portfolio-page>` - Landing page component
  - Fetches main portfolio album
  - Displays cover hero + photo grid
- [ ] `<album-list-page>` - Public albums listing
  - Fetches all public albums
  - Grid of album cards
- [ ] `<album-detail-page>` - Individual album view
  - Fetches album by slug
  - Cover hero + photo grid + lightbox
  - Password protection check
  - Download functionality

#### Component Features

- [ ] Reactive state management with Lit reactive properties
- [ ] Shadow DOM for style encapsulation
- [ ] Event-driven communication between components
- [ ] Keyboard navigation support
- [ ] Touch gesture support for mobile
- [ ] URL state management (e.g., lightbox photo index in URL)

### 3.6 Download Functionality

Albums display photos at full quality. Users can right-click to save individual photos.

---

## Phase 4: Backend - Admin Server

### 4.1 Core Server Setup

- [ ] HTTP server with routing (chi router)
- [ ] Static file serving (for uploaded images)
- [ ] CORS configuration
- [ ] Logging middleware (structured logging)
- [ ] Error handling middleware
- [ ] Request ID tracking
- [ ] Panic recovery middleware

#### 4.1.1 Error Handling Strategy

**Philosophy**:

- Log everything server-side with full context
- Return safe, user-friendly errors to clients
- Never expose internal details in production
- Provide detailed errors in development mode
- Track errors for debugging and monitoring

#### 4.1.2 Logging Strategy

**Philosophy**:

- Structured logging for easy parsing and searching
- Different log levels for different environments
- Request tracing with unique IDs
- Log rotation and retention
- No sensitive data in logs (passwords, tokens, full IPs)

**Logging Library**: Use Go's `log/slog` (standard library, Go 1.21+)

**What to Log**:

✅ **DO Log**:

- All HTTP requests (method, path, status, duration)
- Authentication events (login, logout, failed attempts)
- Data mutations (create, update, delete operations)
- Image processing events (upload, resize, errors)
- System events (startup, shutdown, disk space warnings)
- Errors with full context
- Performance metrics

❌ **DO NOT Log**:

- Passwords or password hashes
- Session tokens or CSRF tokens
- Full IP addresses (hash them)
- Photo file contents or binary data
- Personal identifying information

#### 4.1.3 Error Handling in Frontend

**Toast/Notification System**:

- Provide a basic toast popup notification system for errors.

### 4.2 Authentication & Authorization

**Philosophy**: Simple, secure authentication for a single admin user. No database needed - use file-based sessions and environment variables for credentials.

#### 4.2.1 Authentication Strategy

**Single Admin User Model**:

- Admin credentials stored in environment variables (`env`)
- Password hashed with bcrypt (stored hash in env or first-run setup)
- Session-based authentication (not JWT - simpler for single-page admin)
- Sessions stored in encrypted files or in-memory with persistence

**Why Session-Based**:

- Simpler than JWT for single-user admin panel
- Can be easily invalidated server-side
- Works well with CSRF protection
- No token refresh complexity

#### 4.2.2 Session Management

**Session Configuration**:

- Session duration: 24 hours (configurable)
- Extend session on activity: Yes
- Session cookie name: `photoadmin_session`
- Cookie settings:
  - `HttpOnly: true` (prevent XSS)
  - `Secure: true` (HTTPS only in production)
  - `SameSite: Strict` (CSRF protection)
  - `Path: /admin`

#### 4.2.3 Authentication Flow

**Login Process**:

```text
1. User visits /admin → Redirected to /admin/login
2. User submits credentials
3. Backend verifies against env variables
4. Create session and set cookie
5. Redirect to /admin/dashboard
```

#### 4.2.4 Authentication Middleware

#### 4.2.9 Implementation Checklist

**Backend**:

- [ ] Session store implementation (file-based or in-memory)
- [ ] Login handler with bcrypt verification
- [ ] Logout handler
- [ ] Auth middleware for protected routes
- [ ] Rate limiting for login attempts
- [ ] Security headers middleware
- [ ] Password change endpoint
- [ ] Admin setup CLI tool for initial password

**Frontend**:

- [ ] Login page component
- [ ] Login form with validation
- [ ] Store session/CSRF token
- [ ] Include CSRF token in all API calls
- [ ] Handle 401 responses (redirect to login)
- [ ] Logout button in admin header
- [ ] Session expiration warning (show modal 5 mins before expiry)
- [ ] Auto-logout on session expiration

**Environment/Config**:

- [ ] Add auth variables to `env.example`
- [ ] Document session configuration options
- [ ] Add password requirements to docs
- [ ] Security best practices documentation

### 4.3 JSON File Management Service

- [ ] Atomic file read/write operations
- [ ] File locking mechanism
- [ ] Backup before write
- [ ] Validation before saving
- [ ] Rollback capability

### 4.4 Image Processing Service

**Philosophy**: Professional photography requires careful handling - preserve originals, generate optimized versions for web.

#### 4.4.1 Upload Constraints and Validation

**File Size Limits**:

- **Single file maximum**: 100 MB (configurable)
- **Batch upload maximum**: 5000 MB total (configurable)
- **Max files per batch**: 500 files (configurable)
- **Rationale**: Balance between professional photography file sizes and server resources

**Allowed File Types**:

- **JPEG**: `.jpg`, `.jpeg` (most common)
- **PNG**: `.png` (transparency support)
- **WebP**: `.webp` (modern format)
- **HEIC**: `.heic`, `.heif` (iPhone photos)

**File Type Detection**:

- **DO NOT trust file extension** - validate via magic bytes
- Use Go's `http.DetectContentType()` or `github.com/h2non/filetype`
- Reject files that don't match expected image MIME types

**Filename Sanitization**:

- Original filename stored in metadata but not used for storage
- Storage filename: UUID + `.webp` (or original extension for originals)
- Reject filenames with path traversal attempts (`../`, `..\\`)
- Strip special characters that could cause filesystem issues

**Configuration** (`env` or `site_config.json`):

#### 4.4.4 Upload Pipeline

- [ ] Multi-file upload handler (drag-drop or click-to-upload)
- [ ] **File validation** (size, type, dimensions, magic bytes)
- [ ] **Disk space check** before processing
- [ ] **Sanitize filenames** for security
- [ ] Progress tracking for batch uploads
- [ ] Unique filename generation (UUID-based)
- [ ] Concurrent processing (process multiple images in parallel)
- [ ] **Detailed error reporting** for failed uploads
- [ ] **Partial success handling** (some files succeed, some fail)

#### Image Processing Workflow

When an image is uploaded, the backend creates three versions:

1. **Original** (`/static/uploads/originals/`)

   - [ ] Store untouched original file
   - [ ] Preserve original filename in metadata
   - [ ] No compression, no resizing

2. **Display Version** (`/static/uploads/display/`)

   - [ ] Target: 3840px on longest side (optimized for 4K displays)
   - [ ] Format: WebP with quality 85
   - [ ] Maintain aspect ratio
   - [ ] Strip EXIF (privacy - except for display purposes)
   - [ ] Target file size: ~800KB-1.5MB (acceptable for beautiful 4K viewing)

3. **Thumbnail** (`/static/uploads/thumbnails/`)
   - [ ] Target: 800px on longest side
   - [ ] Format: WebP with quality 80
   - [ ] Maintain aspect ratio
   - [ ] Target file size: ~50-100KB

#### EXIF Processing

- [ ] Extract EXIF from original using Go library (e.g., `github.com/rwcarlsen/goexif`)
- [ ] Parse camera, lens, ISO, aperture, shutter speed, focal length
- [ ] Store in photo metadata (albums.json)
- [ ] Extract date taken for sorting

#### Storage Organization

```text
/static/uploads/
├── originals/
│   └── <uuid>.<original-ext>  (e.g., abc123.jpg, def456.cr2)
├── display/
│   └── <uuid>.webp
└── thumbnails/
    └── <uuid>.webp
```

#### Image Libraries (Go)

- [ ] `github.com/disintegration/imaging` - Image resizing and processing
- [ ] `github.com/rwcarlsen/goexif` - EXIF extraction
- [ ] Native `image/jpeg`, `image/png` support
- [ ] WebP encoding support

### 4.5 Admin API Endpoints

#### Album Management

- `GET /api/admin/albums` - List all albums
- `GET /api/admin/albums/:id` - Get album details
- `POST /api/admin/albums` - Create new album
- `PUT /api/admin/albums/:id` - Update album metadata (title, subtitle, visibility, etc.)
- `DELETE /api/admin/albums/:id` - Delete album (and optionally photos)
- `POST /api/admin/albums/:id/set-cover` - Set cover photo for album
- `POST /api/admin/albums/:id/reorder` - Reorder photos in album

#### Photo Upload & Management

**Upload Workflow**:

1. Admin selects/creates album
2. Uploads photos to that album
3. Backend processes: original → display → thumbnail
4. Returns photo metadata

Endpoints:

- `POST /api/admin/albums/:id/photos/upload` - Upload photos to album (multipart form)
  - Accepts multiple files
  - Returns array of photo objects with IDs
  - Processing happens asynchronously, returns immediately with status
- `GET /api/admin/albums/:id/photos/upload-status/:batchId` - Check upload batch status
- `PUT /api/admin/albums/:id/photos/:photoId` - Update photo metadata (caption, alt text, order)
- `DELETE /api/admin/albums/:id/photos/:photoId` - Delete photo from album
- `POST /api/admin/albums/:id/photos/reorder` - Reorder photos in album

#### Password Management <!-- pragma: allowlist secret -->

- `POST /api/admin/albums/:id/set-password` - Set or update password for album <!-- pragma: allowlist secret -->
  - Body: `{ "password": "plaintext" }` <!-- pragma: allowlist secret -->
  - Backend bcrypts and stores hash
- `DELETE /api/admin/albums/:id/password` - Remove password protection <!-- pragma: allowlist secret -->

#### Main Portfolio Album

- `PUT /api/admin/config/main-portfolio-album` - Set which album is the main portfolio
  - Body: `{ "album_id": "uuid" }`
  - Updates `site_config.json`

#### Media Management

- `POST /api/admin/upload` - Upload images
- `GET /api/admin/media` - List uploaded media
- `DELETE /api/admin/media/:id` - Delete media

#### Site Configuration / Settings

- `GET /api/admin/settings` - Get complete site configuration
- `PUT /api/admin/settings` - Update entire site configuration
- `PATCH /api/admin/settings/:section` - Update specific section (site, owner, social, branding, etc.)
  - Examples:
    - `PATCH /api/admin/settings/site` - Update site settings only
    - `PATCH /api/admin/settings/branding` - Update branding only
- `POST /api/admin/settings/upload-logo` - Upload logo image
- `POST /api/admin/settings/upload-favicon` - Upload favicon
- `POST /api/admin/settings/upload-watermark` - Upload watermark image
- `GET /api/admin/settings/preview` - Preview current settings

### 4.6 Admin UI (Server-Rendered HTML)

#### Dashboard

- [ ] Overview stats
  - Total albums (public, unlisted, password-protected)
  - Total photos
  - Recent uploads

#### Album Management Page

**Main View** - Album List:

- [ ] Grid/list view of all albums
- [ ] Show album cover, title, visibility status
- [ ] Filter by visibility (all, public, unlisted, password-protected)
- [ ] Search by album name
- [ ] "Create New Album" button
- [ ] Quick actions: Edit, Delete, View Public URL

**Album Editor** - Edit Single Album:

- [ ] Album metadata form
  - Title (required)
  - Subtitle (optional)
  - Description (rich text)
  - Visibility dropdown (public, unlisted, password_protected)
  - Password field (shown only if password_protected)
  - Allow downloads toggle
  - Expiration date (optional, datepicker)
- [ ] Photo upload zone
  - Drag-drop area
  - Click to browse files
  - Multi-file selection
  - Upload progress bar with thumbnails
  - Processing status indicator
- [ ] Photo grid view
  - Thumbnails of all photos in album
  - Drag-drop reordering
  - Click photo to edit caption/alt text
  - "Set as Cover" button on each photo
  - Delete photo button
  - Current cover photo highlighted
- [ ] Cover photo display
  - Large preview of current cover
  - "Select Cover Photo" flow
- [ ] Save/Cancel buttons

#### Main Portfolio Album Selector

- [ ] Dropdown or modal to select which album is the main portfolio
- [ ] Preview of selected album
- [ ] "Set as Main Portfolio" button

#### Settings Page

**Comprehensive settings management with tabbed/sectioned interface**

**Main Layout**:

- [ ] Tabbed or sidebar navigation for different setting sections
- [ ] "Save Changes" button (sticky at bottom or top)
- [ ] "Reset to Default" option with confirmation
- [ ] Unsaved changes warning

**Section 1: General Settings**

- [ ] Site title (required field)
- [ ] Site tagline/subtitle
- [ ] Site description (textarea)

**Section 2: Owner Information**

- [ ] Owner name
- [ ] Bio (rich text editor with Markdown support)
- [ ] Email address
- [ ] Phone number
- [ ] Location

**Section 3: Social Media**

- [ ] Input fields for each platform:
  - Instagram, Facebook, Twitter, LinkedIn
  - YouTube, Pinterest, TikTok
- [ ] Add custom social link button
  - Label input
  - URL input
  - Remove button for each custom link
- [ ] Preview of how social links will appear

**Section 4: Branding**

- [ ] Logo upload
  - Image preview
  - Drag-drop or click to upload
  - Recommended dimensions displayed
- [ ] Favicon upload
  - Preview
  - Format requirements (ICO, PNG)
- [ ] Color scheme
  - Primary color picker
  - Secondary color picker
  - Accent color picker
  - Preview of color scheme
- [ ] Typography
  - Heading font dropdown (Google Fonts)
  - Body font dropdown (Google Fonts)
  - Font preview

**Section 5: Portfolio Settings**

- [ ] Main portfolio album selector
  - Dropdown of all albums
  - Preview of selected album
- [ ] Default photo layout (masonry, grid, justified)
- [ ] Show EXIF data toggle
- [ ] Show photo count toggle

**Section 6: Gallery Defaults**

- [ ] Default visibility (public, unlisted, password_protected)
- [ ] Default allow downloads toggle

**Section 7: System & Maintenance**

- [ ] Admin password change
  - Current password
  - New password
  - Confirm password
- [ ] System information (read-only)
  - Version number
  - Last updated timestamp
  - Go version
  - Total uptime

**UI/UX Considerations**:

- [ ] Form validation with inline error messages
- [ ] Success notifications after save
- [ ] Unsaved changes prompt before leaving page
- [ ] Keyboard shortcuts (Cmd/Ctrl+S to save)
- [ ] Mobile-responsive layout

**API Endpoints Used**:

**Implementation Notes**:

- All queries should be efficient with proper indexes
- Cache aggregated stats for common time periods
- Daily stats table provides fast queries for historical data
- Privacy: Only show hashed IPs, never raw IPs
- Consider data retention policy (90 days by default)

---

## Phase 5: Integration & Build System

See the [DEVELOPMENT_SETUP.md](DEVELOPMENT_SETUP.md) for details.
Summary here:

### 5.1 Development Scripts

**Frontend** (`frontend/scripts/`):

- [x] `dev.sh` - Run frontend dev server
- [x] `build.sh` - Build frontend for production
- [x] `test.sh` - Run unit tests
- [x] `lint.sh` - Lint TypeScript
- [x] `format.sh` - Format code with Prettier

**Backend** (`backend/scripts/`):

- [x] `dev.sh` - Run admin server with hot-reload
- [x] `build.sh` - Build Go binary
- [x] `test.sh` - Run Go unit tests
- [x] `lint.sh` - Lint Go code
- [x] `fmt.sh` - Format Go code

### 5.2 Development Workflow

- [x] Script to initialize data JSON files with defaults (`scripts/bootstrap.sh`)
- [x] Convenience scripts to run both frontend and backend (`dev.sh`)
- [x] Hot-reload configuration for both frontend and backend
- [x] Development environment documentation

### 5.3 Testing Strategy (Simplified)

**MVP Approach**: Start with pre-commit hooks, automated unit testing, and manual end-to-end testing.

**Initial Testing**:

- **Pre-commit hooks**: Linting, formatting, type-checking (automated)
- **Manual E2E**: Key workflows tested manually before each release
- **Critical unit tests**: Core business logic only (auth, file I/O)
- Component tests for all Lit components
- Integration tests for API endpoints

#### 5.3.1 Pre-commit Quality Checks

Already configured in Phase 1.5:

- Linting (ESLint for TS, golangci-lint for Go)
- Formatting (Prettier, gofmt)
- Type checking (tsc --noEmit)
- JSON/YAML validation
- Secret detection

#### 5.3.2 Critical Unit Tests (Minimal Set)

**Frontend** (`frontend/src/utils/`):

- [ ] `api.test.ts` - Data fetching and error handling
- [ ] `router.test.ts` - URL routing logic
- [ ] `theme-manager.test.ts` - Theme detection, switching, and persistence (see Phase 3)

**Backend** (`backend/internal/`):

- [ ] `models/album_test.go` - Album validation logic
- [ ] `services/file_service_test.go` - Atomic file writes
- [ ] `services/auth_service_test.go` - Password verification

**Test Framework Setup**:

#### 5.3.3 Manual E2E Test Checklist

**Admin API Testing (Automated)**: ✅ **COMPLETE**

Created comprehensive API test suite (`scripts/test-api.sh`):

- ✅ All 13 core API endpoint tests passing
- ✅ Server management scripts (start/stop backend)
- ✅ Authentication and session management tests
- ✅ Album CRUD operations (create, read, update, delete)
- ✅ Authorization checks (401 on protected endpoints)

See [API_TEST_RESULTS.md](./API_TEST_RESULTS.md) for detailed test documentation.

**Remaining Manual Tests**:

Test these key workflows manually before each release:

**Public Site**:

- [ ] Landing page loads and displays portfolio album
- [ ] Album list shows public albums
- [ ] Album detail page displays photos
- [ ] Lightbox opens, navigates (arrows, ESC works)
- [ ] Password-protected album requires password
- [ ] Correct password grants access
- [ ] Mobile responsive design works
- [ ] Theme toggle switches between light and dark mode
- [ ] Theme preference persists after page reload
- [ ] System theme detection works correctly
- [ ] Per-album theme override applies correctly
- [ ] Theme colors render properly in all components

**Admin** (remaining manual tests not covered by API test suite):

Admin Frontend ✅ **COMPLETE**:

- ✅ Admin API utilities with full backend integration
- ✅ Login page with authentication and auto-redirect
- ✅ Albums dashboard with grid view, delete modal, quick actions
- ✅ Album editor with metadata form and photo management
- ✅ Drag-and-drop photo upload with progress
- ✅ Photo grid with cover selection
- ✅ Individual photo deletion
- ✅ Enhanced router with dynamic params and auth guards

**Manual Browser Testing** (Phase 5.5):

- [ ] Admin login page loads and accepts credentials
- [ ] Successful login redirects to albums dashboard
- [ ] Albums dashboard displays all albums with thumbnails
- [ ] "New Album" button navigates to editor
- [ ] Album editor form accepts all metadata inputs
- [ ] Save new album creates album and redirects to edit mode
- [ ] Photo drag-and-drop upload works
- [ ] Photo click-to-browse upload works
- [ ] Uploaded photos display in grid
- [ ] Set cover photo updates album thumbnail
- [ ] Delete photo removes from album
- [ ] Save existing album updates successfully
- [ ] Delete album (with confirmation) removes album
- [ ] Logout button clears session and redirects to login
- [ ] Auth guards prevent unauthorized access to admin pages
- [ ] Mobile responsive design works for admin interface

---
