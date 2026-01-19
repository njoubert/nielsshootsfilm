# User-adjustable Typography System

## Overview

Implement a two-tier typography system: global site fonts (heading + body) that apply to all public pages, with optional per-album overrides. Admin pages remain unaffected and continue using Raleway.

## Current State

- **Fixed typography**: All pages use Raleway font (hardcoded)
- **Google Fonts CDN dependency**: `index.html` loads Raleway from Google Fonts (external)
- **No site-wide font configuration**: Fonts are hardcoded in CSS

## Goals

1. **Global site fonts**: Admin can set site-wide heading and body fonts in Site Settings > Style
2. **Consistent public experience**: All public pages use the global fonts uniformly
3. **Per-album overrides**: Optionally override heading/body fonts for individual albums
4. **Nice font picker**: Dropdown component that renders each font name in its own font
5. **Admin pages unchanged**: Continue using Raleway for admin UI consistency
6. **Two font categories only**: Heading font and Body font (not title/subtitle/description)
7. **Self-hosted fonts**: All fonts served locally from `static/fonts/` - no external CDN dependencies
8. **System font fallbacks**: Graceful degradation to system fonts if custom fonts fail to load

## Technical Approach

### Font Categories

Only two font categories:

1. **Heading Font**: Used for titles, album names, section headers, navigation items
2. **Body Font**: Used for descriptions, paragraphs, captions, UI text

### Font Naming Strategy

**Use Google Font family names** (e.g., "Playfair Display", "Montserrat", "Lora") as identifiers. These are:

- Universal/standard CSS font-family names
- Human-readable for the admin UI
- Source for downloading via `sync-fonts.sh`

### Single Source of Truth: `curated-fonts.json`

**The canonical font list lives in one place**: `static/fonts/curated-fonts.json`

This JSON file defines all available fonts and is read by:

1. `sync-fonts.sh` - to know which fonts to download
2. `frontend/src/utils/font-loader.ts` - to validate font selections
3. `frontend/src/components/font-picker.ts` - to populate the dropdown

```json
{
  "fonts": {
    "serif": [
      { "name": "Playfair Display", "slug": "playfair-display" },
      { "name": "Lora", "slug": "lora" },
      { "name": "Merriweather", "slug": "merriweather" },
      { "name": "Libre Baskerville", "slug": "libre-baskerville" },
      { "name": "Crimson Text", "slug": "crimson-text" },
      { "name": "Cormorant", "slug": "cormorant" },
      { "name": "Spectral", "slug": "spectral" },
      { "name": "Eczar", "slug": "eczar" },
      { "name": "Inknut Antiqua", "slug": "inknut-antiqua" },
      { "name": "BioRhyme", "slug": "biorhyme" },
      { "name": "Roboto Slab", "slug": "roboto-slab" },
      { "name": "Slabo 27px", "slug": "slabo-27px" }
    ],
    "sansSerif": [
      { "name": "Raleway", "slug": "raleway" },
      { "name": "Inter", "slug": "inter" },
      { "name": "Roboto", "slug": "roboto" },
      { "name": "Open Sans", "slug": "open-sans" },
      { "name": "Lato", "slug": "lato" },
      { "name": "Montserrat", "slug": "montserrat" },
      { "name": "Source Sans 3", "slug": "source-sans-3" },
      { "name": "Poppins", "slug": "poppins" },
      { "name": "Nunito", "slug": "nunito" },
      { "name": "Work Sans", "slug": "work-sans" },
      { "name": "Manrope", "slug": "manrope" },
      { "name": "DM Sans", "slug": "dm-sans" },
      { "name": "Fira Sans", "slug": "fira-sans" },
      { "name": "Karla", "slug": "karla" },
      { "name": "Rubik", "slug": "rubik" },
      { "name": "PT Sans", "slug": "pt-sans" },
      { "name": "Noto Sans", "slug": "noto-sans" },
      { "name": "Roboto Condensed", "slug": "roboto-condensed" },
      { "name": "Space Grotesk", "slug": "space-grotesk" },
      { "name": "Chivo", "slug": "chivo" },
      { "name": "Archivo Narrow", "slug": "archivo-narrow" },
      { "name": "Proza Libre", "slug": "proza-libre" },
      { "name": "IBM Plex Sans", "slug": "ibm-plex-sans" },
      { "name": "Syne", "slug": "syne" }
    ],
    "display": [
      { "name": "Oswald", "slug": "oswald" },
      { "name": "Bebas Neue", "slug": "bebas-neue" },
      { "name": "Archivo Black", "slug": "archivo-black" },
      { "name": "Anton", "slug": "anton" }
    ],
    "monospace": [
      { "name": "Space Mono", "slug": "space-mono" },
      { "name": "Inconsolata", "slug": "inconsolata" }
    ],
    "handwriting": [
      { "name": "Dancing Script", "slug": "dancing-script" },
      { "name": "Pacifico", "slug": "pacifico" },
      { "name": "Great Vibes", "slug": "great-vibes" }
    ]
  },
  "defaultFont": "Raleway"
}
```

**Note**: Some fonts mentioned (Gooper, Cringe Sans, Hydra, RST Thermal, Romie, Rhythmic Regal, NaN Serf, Push) are commercial/premium fonts not available on Google Fonts and are excluded from this list.

**Why JSON?**

- Readable by both shell scripts (via `jq`) and TypeScript
- Easy to edit manually
- Can be committed to git (unlike downloaded font files)
- Single place to add/remove fonts

### Local Font Hosting (No External Dependencies)

**Philosophy**: The website should never depend on external services for fonts. All fonts are:

1. Downloaded from Google Fonts **at build/sync time** (not runtime)
2. Stored locally in `static/fonts/<font-name>/`
3. Served directly from our webserver
4. Fall back to system fonts if anything fails

**Directory structure**:

```
static/fonts/
├── fonts.css                    # Generated @font-face declarations
├── raleway/
│   ├── Raleway-Regular.woff2
│   └── Raleway-Bold.woff2
├── playfair-display/
│   ├── PlayfairDisplay-Regular.woff2
│   └── PlayfairDisplay-Bold.woff2
├── montserrat/
│   ├── Montserrat-Regular.woff2
│   └── Montserrat-Bold.woff2
└── ... (all curated fonts)
```

**`sync-fonts.sh` script**:

A new script that:

1. Reads the curated font list
2. Downloads each font from Google Fonts API (woff2 format)
3. Saves to `static/fonts/<font-name>/`
4. Generates `static/fonts/fonts.css` with all `@font-face` declarations
5. Run once during setup or when adding new fonts (not at runtime)

```bash
# Usage
./sync-fonts.sh           # Download all curated fonts
./sync-fonts.sh --list    # List available fonts
./sync-fonts.sh --clean   # Remove all downloaded fonts
```

**Loading strategy**:

1. **All pages**: Include `<link href="/fonts/fonts.css">` in `<head>`
2. **All curated fonts are pre-downloaded**: No runtime fetching needed
3. **CSS variables**: Switch fonts by changing `--font-heading` and `--font-body`

### Data Model Changes

**Backend (Go) - `site_config.go`** (new fields):

```go
type SiteConfig struct {
    // ... existing fields ...
    FontHeading string `json:"font_heading,omitempty"` // e.g., "Playfair Display"
    FontBody    string `json:"font_body,omitempty"`    // e.g., "Lora"
}
```

**Backend (Go) - `album.go`**:

```go
type Album struct {
    // ... existing fields ...
    FontHeading string `json:"font_heading,omitempty"` // Override site heading font
    FontBody    string `json:"font_body,omitempty"`    // Override site body font
}
```

**Frontend (TypeScript) - `data-models.ts`**:

```typescript
export interface SiteConfig {
  // ... existing fields ...
  font_heading?: string;
  font_body?: string;
}

export interface Album {
  // ... existing fields ...
  font_heading?: string; // Optional override
  font_body?: string; // Optional override
}
```

**Default behavior**:

- If site config fonts are empty → fall back to "Raleway"
- If album fonts are empty → use site config fonts
- Admin pages always use Raleway (CSS scoped to admin routes)

### Where Fonts Apply (Public Pages Only)

**Heading font applies to**:

- Album titles (hero, cards, breadcrumbs)
- Page titles
- Navigation items
- Section headers
- Any `<h1>` through `<h6>` elements

**Body font applies to**:

- Album descriptions
- Photo captions
- Paragraph text
- UI labels and buttons
- Any body text content

**Admin pages excluded**: Admin routes (`/admin/*`) will have scoped CSS that enforces Raleway, unaffected by site font settings.

### Implementation Components

#### 1. Font Picker Component (`font-picker.ts`)

A new Lit component for font selection:

- Dropdown that shows font names **rendered in their own font**
- Reads font list from `curated-fonts.json` (single source of truth)
- Groups fonts by category (serif, sans-serif, display, handwriting)
- Clear "Use site default" option for album overrides
- Emits `font-change` event with selected font name

**Why curated list?**: Google Fonts has 1600+ fonts. A curated list of ~50 popular/quality fonts is more practical and avoids overwhelming the admin.

#### 2. Site Settings Style Tab (`admin-site-settings-page.ts`)

Add a "Style" section/tab in Site Settings:

- Heading Font picker (default: Raleway)
- Body Font picker (default: Raleway)
- Preview panel showing sample text in selected fonts

#### 3. Album Editor Font Overrides (`admin-album-editor-page.ts`)

Add font override section in album editor:

- Heading Font picker with "Use site default" as first option
- Body Font picker with "Use site default" as first option
- Clear indication when using defaults vs custom fonts

#### 4. Global Font Application (`utils/font-loader.ts`)

A utility to manage CSS variable application (no runtime font loading needed since all fonts are pre-downloaded):

```typescript
// System font stack fallbacks
const SYSTEM_SERIF = "'Georgia', 'Times New Roman', serif";
const SYSTEM_SANS = "'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', sans-serif";

// Font list loaded from curated-fonts.json (single source of truth)
// This is imported at build time, not fetched at runtime
import curatedFonts from '/fonts/curated-fonts.json';

export function getFontCategory(
  fontFamily: string
): 'serif' | 'sansSerif' | 'display' | 'handwriting' | null {
  for (const [category, fonts] of Object.entries(curatedFonts.fonts)) {
    if (fonts.some((f) => f.name === fontFamily)) {
      return category as 'serif' | 'sansSerif' | 'display' | 'handwriting';
    }
  }
  return null;
}

export function getFontStack(fontFamily: string): string {
  // Determine appropriate system fallback based on font category
  const category = getFontCategory(fontFamily);
  const isSerif = category === 'serif';
  const systemFallback = isSerif ? SYSTEM_SERIF : SYSTEM_SANS;
  return `'${fontFamily}', ${systemFallback}`;
}

export function applySiteFonts(config: SiteConfig): void {
  const heading = config.font_heading || 'Raleway';
  const body = config.font_body || 'Raleway';

  // Set CSS custom properties on :root (fonts already loaded via fonts.css)
  document.documentElement.style.setProperty('--font-heading', getFontStack(heading));
  document.documentElement.style.setProperty('--font-body', getFontStack(body));
}

export function applyAlbumFontOverrides(album: Album, siteConfig: SiteConfig): void {
  const heading = album.font_heading || siteConfig.font_heading || 'Raleway';
  const body = album.font_body || siteConfig.font_body || 'Raleway';

  // Set CSS custom properties (fonts already loaded via fonts.css)
  document.documentElement.style.setProperty('--font-heading', getFontStack(heading));
  document.documentElement.style.setProperty('--font-body', getFontStack(body));
}

export function restoreSiteFonts(siteConfig: SiteConfig): void {
  applySiteFonts(siteConfig);
}
```

#### 5. CSS Architecture

**Global CSS variables** (in main stylesheet):

```css
:root {
  --font-heading: 'Raleway', sans-serif;
  --font-body: 'Raleway', sans-serif;
}

/* Public pages use the variables */
h1,
h2,
h3,
h4,
h5,
h6,
.heading {
  font-family: var(--font-heading);
}

body,
p,
.body-text {
  font-family: var(--font-body);
}

/* Admin pages override with fixed Raleway */
[data-admin-page] * {
  font-family: 'Raleway', sans-serif !important;
}
```

#### 6. App Initialization

On app startup (before rendering public pages):

1. `fonts.css` is already loaded in `<head>` (all fonts available)
2. Fetch site config
3. Call `applySiteFonts(siteConfig)` to set CSS variables
4. Fonts apply instantly (no network delay)

On album page load:

1. Check if album has font overrides
2. If yes, call `applyAlbumFontOverrides()` to change CSS variables
3. When leaving album page, call `restoreSiteFonts()` to restore

#### 7. sync-fonts.sh Script

A shell script to download and prepare fonts:

```bash
#!/usr/bin/env bash
# sync-fonts.sh - Download curated Google Fonts for local hosting

FONTS_DIR="static/fonts"
FONTS_JSON="$FONTS_DIR/curated-fonts.json"  # Single source of truth
FONTS_CSS="$FONTS_DIR/fonts.css"

# Read font list from curated-fonts.json using jq
# This ensures sync-fonts.sh and TypeScript use the same font list
FONTS=$(jq -r '.fonts | to_entries[] | .value[] | .name' "$FONTS_JSON")

for FONT_NAME in $FONTS; do
  # 1. Convert name to slug: "Playfair Display" -> "playfair-display"
  # 2. Create directory: static/fonts/<font-slug>/
  # 3. Download woff2 files (Regular + Bold weights)
  # 4. Append @font-face CSS to fonts.css
done

# Uses google-webfonts-helper API or direct Google Fonts CSS parsing
# to get direct woff2 URLs
```

**When to run**:

- Once during initial project setup (`./provision.sh` can call it)
- When adding new fonts to the curated list
- Not needed for regular development or deployment

## Implementation Plan

### Phase 1: Data Model & Backend (Small)

1. Add `font_heading` and `font_body` fields to Go `SiteConfig` struct
2. Add `font_heading` and `font_body` fields to Go `Album` struct
3. Add font fields to TypeScript interfaces
4. Test that existing data still works (empty fields = Raleway default)

### Phase 2: sync-fonts.sh Script & Local Font Setup (Medium)

1. Create `sync-fonts.sh` script
2. Implement font download from Google Fonts (woff2 format)
3. Generate `static/fonts/fonts.css` with `@font-face` declarations
4. Download initial set of ~50 curated fonts
5. Add `static/fonts/` to `.gitignore` (fonts downloaded locally, not committed)
6. Update `provision.sh` to run `sync-fonts.sh`

### Phase 3: Font Loader Utility & CSS Architecture (Small)

1. Create `frontend/src/utils/font-loader.ts`
2. Implement `applySiteFonts()` and `applyAlbumFontOverrides()` functions
3. Implement `getFontStack()` for system font fallbacks
4. Set up CSS custom properties (`--font-heading`, `--font-body`)
5. Update global CSS to use the variables
6. Add admin page CSS scoping to preserve Raleway
7. Add `<link href="/fonts/fonts.css">` to `index.html`

### Phase 4: App Initialization (Small)

1. Load site config on app startup
2. Apply site fonts via CSS variables
3. Handle album page font overrides (apply on enter, restore on leave)

### Phase 5: Font Picker Component (Medium)

1. Create `frontend/src/components/font-picker.ts`
2. Curated list of ~50 fonts organized by category (shared with sync-fonts.sh)
3. Dropdown renders each font name in its own font (fonts already loaded)
4. "Use site default" option for album overrides
5. Write tests

### Phase 6: Site Settings Integration (Small)

1. Add "Style" section to `admin-site-settings-page.ts`
2. Add heading and body font pickers
3. Save to site config
4. Optional: preview panel

### Phase 7: Album Editor Integration (Small)

1. Add font override section to `admin-album-editor-page.ts`
2. Add heading and body font pickers with "Use site default" option
3. Save font overrides with album

### Phase 8: Testing & Polish (Small)

1. Test font rendering across browsers
2. Test system font fallbacks (disable fonts.css to verify)
3. Test admin pages remain unaffected
4. Ensure pre-commit hooks pass
5. Manual E2E testing across all public pages
6. Verify no external network requests for fonts

## Decisions (Resolved)

1. **Font weight selection**: No manual weight selection. Automatically use 400 (Regular) for body text and 700 (Bold) for headings.

2. **Preview in site settings**: No preview panel. User sees font changes applied to actual pages immediately.

3. **Font categories**: Include all four categories in the picker:
   - Serif (elegant, traditional)
   - Sans-serif (modern, clean)
   - Display (dramatic, artistic)
   - Handwriting/script (personal, artistic)

## Dependencies

- **Google Fonts API** (used only at sync time by `sync-fonts.sh`, not at runtime)
- **curl** or **wget** (for downloading fonts in sync script)
- **jq** (for parsing `curated-fonts.json` in shell script)
- No new npm packages needed (pure CSS/JS solution)
- No runtime external dependencies - fully self-hosted

## Files to Modify/Create

### New Files

- `static/fonts/curated-fonts.json` - **Single source of truth** for available fonts (committed to git)
- `sync-fonts.sh` - Script to download fonts from Google Fonts to `static/fonts/`
- `static/fonts/*/` - Directories for font files (gitignored, downloaded by sync-fonts.sh)
- `static/fonts/fonts.css` - Generated `@font-face` declarations (gitignored)
- `frontend/src/components/font-picker.ts` - Font picker dropdown component
- `frontend/src/components/font-picker.test.ts` - Tests
- `frontend/src/utils/font-loader.ts` - Font CSS variable management utility
- `frontend/src/utils/font-loader.test.ts` - Tests

### Modified Files

- `.gitignore` - Add `static/fonts/*/` and `static/fonts/fonts.css` (but NOT `curated-fonts.json`)
- `provision.sh` - Run `sync-fonts.sh` during setup
- `frontend/index.html` - Add `<link href="/fonts/fonts.css">`
- `backend/internal/models/site_config.go` - Add `font_heading`, `font_body` fields
- `backend/internal/models/album.go` - Add `font_heading`, `font_body` fields
- `frontend/src/types/data-models.ts` - Add font fields to SiteConfig and Album interfaces
- `frontend/src/styles/` - Update global CSS to use `--font-heading` and `--font-body` variables
- `frontend/src/app-shell.ts` or entry point - Apply site fonts on startup
- `frontend/src/pages/admin-site-settings-page.ts` - Add "Style" section with font pickers
- `frontend/src/pages/admin-album-editor-page.ts` - Add font override pickers
- `frontend/src/pages/album-detail-page.ts` - Apply album font overrides when present

## Next Steps After Approval

1. Start with Phase 1 (data model) - safest, easiest to validate
2. Phase 2 (sync-fonts.sh) - establish local font infrastructure
3. Phase 3+4 (font loader + CSS) - see fonts working locally
4. Phase 5+6+7 (admin UI) - full feature complete
5. Phase 8 (testing) - ensure quality, verify no external requests
