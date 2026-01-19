# User-adjustable Typography for Album Titles, Subtitles, and Descriptions

## Overview

Allow the admin to customize fonts for each album's title, subtitle, and description using Google Fonts. This enables creative control over typography to match the mood of each gallery.

## Current State

- **Fixed typography**: All albums use Raleway font (hardcoded)
- **Google Fonts already integrated**: `index.html` loads Raleway from Google Fonts CDN
- **Three text elements per album**:
  - Title (rendered in `album-cover-hero` component, 52px, uppercase)
  - Subtitle (rendered in `album-cover-hero`, 14px, uppercase)
  - Description (rendered in `album-detail-page`, body text style)

## Goals

1. Admin can select different fonts for title, subtitle, and description per album
2. Use Google Fonts API (no local font hosting)
3. Nice font picker dropdown with preview
4. Render selected fonts in gallery view
5. Use universal font names (Google Font family names are web standards)

## Technical Approach

### Font Naming Strategy

**Use Google Font family names directly** (e.g., "Playfair Display", "Montserrat", "Lora"). These are:

- Universal/standard CSS font-family names
- Directly usable with Google Fonts CSS API
- Human-readable for the admin UI
- Portable if we ever switch font providers

### Google Fonts API Integration

Google Fonts can be loaded dynamically without pre-registering fonts. We can construct URLs like:

```
https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap
```

**Two loading strategies**:

1. **Admin page**: Load ALL fonts for the picker preview (use Google Fonts API metadata)
2. **Gallery view**: Load only the fonts actually used by the album

### Data Model Changes

**Backend (Go) - `album.go`**:

```go
type Album struct {
    // ... existing fields ...
    FontTitle       string `json:"font_title,omitempty"`       // e.g., "Playfair Display"
    FontSubtitle    string `json:"font_subtitle,omitempty"`    // e.g., "Montserrat"
    FontDescription string `json:"font_description,omitempty"` // e.g., "Lora"
}
```

**Frontend (TypeScript) - `data-models.ts`**:

```typescript
export interface Album {
  // ... existing fields ...
  font_title?: string;
  font_subtitle?: string;
  font_description?: string;
}
```

**Default behavior**: If font fields are empty/undefined, fall back to "Raleway" (current default).

### Implementation Components

#### 1. Font Picker Component (`font-picker.ts`)

A new Lit component for the admin:

- Dropdown with ~50 curated popular Google Fonts
- Each option shows font name rendered in that font (preview)
- Uses Google Fonts CSS API to load preview fonts
- Emits `font-change` event with selected font name

**Why curated list?**: Google Fonts has 1600+ fonts. Loading all metadata would be slow. A curated list of 50-100 popular/recommended fonts is more practical and avoids overwhelming the admin.

```typescript
// Curated list approach
const CURATED_FONTS = [
  'Raleway', // Current default
  'Playfair Display', // Elegant serif
  'Montserrat', // Modern sans
  'Lora', // Readable serif
  'Open Sans', // Clean sans
  'Roboto', // Google's flagship
  'Merriweather', // Readable serif
  'Oswald', // Bold display
  'Source Sans 3', // Adobe's open source
  'Libre Baskerville', // Classic serif
  // ... ~40 more
];
```

#### 2. Album Editor Updates (`admin-album-editor-page.ts`)

Add three font picker dropdowns in the "Details" section:

- Title Font
- Subtitle Font
- Description Font

These are simple fields, no need to preview the full result.

#### 3. Album Cover Hero Updates (`album-cover-hero.ts`)

Accept font props and apply them:

```typescript
@property({ type: String }) titleFont = 'Raleway';
@property({ type: String }) subtitleFont = 'Raleway';

// In render():
style="font-family: '${this.titleFont}', sans-serif"
```

#### 4. Album Detail Page Updates (`album-detail-page.ts`)

Apply description font to the description paragraph.

#### 5. Dynamic Font Loading Service (`utils/font-loader.ts`)

A utility to dynamically load Google Fonts:

```typescript
export function loadGoogleFont(fontFamily: string, weights: string[] = ['400', '700']): void {
  // Check if already loaded
  // Create <link> element
  // Append to <head>
}

export function loadAlbumFonts(album: Album): void {
  if (album.font_title) loadGoogleFont(album.font_title);
  if (album.font_subtitle) loadGoogleFont(album.font_subtitle);
  if (album.font_description) loadGoogleFont(album.font_description, ['400']);
}
```

## Implementation Plan

### Phase 1: Data Model & Backend (Small)

1. Add font fields to Go `Album` struct
2. Add font fields to TypeScript `Album` interface
3. Test that existing albums still work (empty fields = default behavior)

### Phase 2: Font Loader Utility (Small)

1. Create `frontend/src/utils/font-loader.ts`
2. Implement `loadGoogleFont()` function
3. Implement `loadAlbumFonts()` function

### Phase 3: Gallery Rendering (Small)

1. Update `album-cover-hero.ts` to accept font props
2. Update `album-detail-page.ts` to apply description font
3. Call `loadAlbumFonts()` when album loads
4. Also update `portfolio-page.ts` if it uses the hero

### Phase 4: Font Picker Component (Medium)

1. Create `frontend/src/components/font-picker.ts`
2. Curated list of ~50 fonts with categories
3. Dropdown with font preview rendering
4. Load preview fonts on component mount

### Phase 5: Admin Editor Integration (Small)

1. Add three font pickers to `admin-album-editor-page.ts`
2. Wire up to album state
3. Save font choices with album updates

### Phase 6: Testing & Polish (Small)

1. Test font loading performance
2. Test fallback behavior for missing fonts
3. Ensure pre-commit hooks pass
4. Manual E2E testing

## Risks & Mitigations

| Risk                        | Impact                  | Mitigation                                        |
| --------------------------- | ----------------------- | ------------------------------------------------- |
| Too many fonts in picker    | UX confusion, slow load | Use curated list of ~50 fonts                     |
| Font not loading in gallery | Broken typography       | CSS fallback: `'FontName', 'Raleway', sans-serif` |
| Font picker bloats bundle   | Performance             | Lazy-load picker component, only in admin         |
| Google Fonts API changes    | Breaking change         | Use stable CSS API, not JS API                    |

## Complexity Highlights

1. **Font picker preview**: Need to load fonts dynamically for dropdown preview
2. **Race condition**: Font might not be loaded when component first renders - use `font-display: swap` strategy
3. **Performance**: Admin page needs to load many fonts for preview; gallery only needs album's fonts

## Unknowns / Questions for User

1. **How many fonts to offer?** Recommend 50 curated fonts covering:

   - Serif (elegant, traditional)
   - Sans-serif (modern, clean)
   - Display (dramatic, artistic)
   - Handwriting/script (personal, artistic)

2. **Should we allow different font weights?**

   - Simple: Just font family (use 400/700 automatically)
   - Complex: Let admin pick weight too
   - **Recommend: Simple approach first**

3. **Should fonts apply to album cards on the homepage too?**
   - Current: Album cards show title in Raleway
   - Option: Apply custom title font to cards
   - **Recommend: Keep cards consistent, only customize gallery view**

## Dependencies

- Google Fonts API (external service, very stable)
- No new npm packages needed (pure CSS/JS solution)

## T-Shirt Size Estimate

**Medium** - Touches multiple components but each change is straightforward:

- ~1 hour: Data model changes
- ~2 hours: Font loader utility
- ~3 hours: Font picker component
- ~2 hours: Admin integration
- ~1 hour: Gallery rendering updates
- ~1 hour: Testing & polish

**Total: ~10 hours estimated**

## Files to Modify/Create

### New Files

- `frontend/src/components/font-picker.ts` - Font picker dropdown component
- `frontend/src/components/font-picker.test.ts` - Tests
- `frontend/src/utils/font-loader.ts` - Dynamic font loading utility
- `frontend/src/utils/font-loader.test.ts` - Tests

### Modified Files

- `backend/internal/models/album.go` - Add font fields
- `frontend/src/types/data-models.ts` - Add font fields to Album interface
- `frontend/src/components/album-cover-hero.ts` - Accept and apply font props
- `frontend/src/pages/album-detail-page.ts` - Apply description font, load fonts
- `frontend/src/pages/portfolio-page.ts` - Pass font props to hero
- `frontend/src/pages/admin-album-editor-page.ts` - Add font pickers

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Admin Album Editor                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │ Title Font  │  │Subtitle Font│  │ Desc Font   │  (font-picker)  │
│  │   Picker    │  │   Picker    │  │   Picker    │                 │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                 │
└─────────┼────────────────┼────────────────┼────────────────────────┘
          │                │                │
          ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        Album Data (JSON)                            │
│  { font_title: "Playfair Display",                                  │
│    font_subtitle: "Montserrat",                                     │
│    font_description: "Lora" }                                       │
└─────────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Gallery View (Public)                          │
│                                                                     │
│  ┌────────────────────────────────────────────┐                     │
│  │        album-cover-hero                    │                     │
│  │  ┌──────────────────────────────────────┐  │                     │
│  │  │ TITLE  (Playfair Display font)       │  │                     │
│  │  │ Subtitle (Montserrat font)           │  │                     │
│  │  └──────────────────────────────────────┘  │                     │
│  └────────────────────────────────────────────┘                     │
│                                                                     │
│  ┌────────────────────────────────────────────┐                     │
│  │  Description paragraph (Lora font)         │                     │
│  └────────────────────────────────────────────┘                     │
│                                                                     │
│  font-loader.ts loads required fonts dynamically                    │
└─────────────────────────────────────────────────────────────────────┘
```

## Next Steps After Approval

1. Start with Phase 1 (data model) - safest, easiest to validate
2. Move to Phase 2+3 (font loader + gallery) - see fonts working
3. Then Phase 4+5 (admin UI) - full feature complete
4. Phase 6 (testing) - ensure quality
