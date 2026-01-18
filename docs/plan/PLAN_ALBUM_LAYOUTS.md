# Plan: Album Layout Selection

**Status**: Planned
**Date**: 2026-01-16
**Size**: Medium
**Priority**: Medium
**Dependencies**: None
**Reference**: [experimental/layouts/index.html](../../experimental/layouts/index.html) - Interactive playground with all layout algorithms

## Problem Statement

Currently, all albums use the same photo grid layout. Users want the ability to choose different visual layouts per album to match the content type or aesthetic they're going for.

## Proposed Solution

Add per-album layout selection with 6 layout algorithms:

1. **Arc** - Justified layout using Flickr's algorithm (row-based, varying heights) - **DEFAULT**
2. **Vibe** - Masonry layout (columns, varying heights per photo)
3. **Insta** - Square grid (Instagram-style, 1:1 aspect ratio crops)
4. **Fit** - Single column, viewport-height images (slideshow-style scrolling)
5. **Big** - Single column, full-width images (traditional blog style)
6. **Original** - Current photo-grid component (CSS grid masonry)

**Layout Size Option**: Arc, Vibe, and Insta layouts support a size modifier (small/large):

- **Small**: Smaller row height (Arc/Insta) or more columns (Vibe) - shows more images at once
- **Large**: Larger row height (Arc/Insta) or fewer columns (Vibe) - more prominent images

Also add a global default layout setting in site configuration.

## Data Model Changes

### Backend: Album Model

Add new fields to `Album` struct in [backend/internal/models/album.go](../../backend/internal/models/album.go):

```go
type Album struct {
  // ... existing fields ...
  Layout     string `json:"layout,omitempty"`      // arc, vibe, insta, fit, big, original (default: from site config)
  LayoutSize string `json:"layout_size,omitempty"` // small, large (default: large) - applies to arc, vibe, insta
}
```

### Frontend: TypeScript Types

Add to `Album` interface in [frontend/src/types/data-models.ts](../../frontend/src/types/data-models.ts):

```typescript
export type AlbumLayout = 'arc' | 'vibe' | 'insta' | 'fit' | 'big' | 'original';
export type LayoutSize = 'small' | 'large';

export interface Album {
  // ... existing fields ...
  layout?: AlbumLayout; // defaults to site config default_album_layout if not specified
  layout_size?: LayoutSize; // defaults to 'large' - applies to arc, vibe, insta layouts
}
```

### Site Configuration

Add to `PortfolioConfig` in both Go and TypeScript:

```typescript
export interface PortfolioConfig {
  // ... existing fields ...
  default_album_layout?: AlbumLayout; // defaults to 'arc'
}
```

### Layout Size Effects

| Layout           | Small                    | Large                    |
| ---------------- | ------------------------ | ------------------------ |
| Arc              | ~200px target row height | ~400px target row height |
| Vibe             | 6 columns (desktop)      | 3-4 columns (desktop)    |
| Insta            | 6 columns (desktop)      | 3-4 columns (desktop)    |
| Fit/Big/Original | No effect                | No effect                |

### Photo Captions (Prepare for Future)

The Photo model already has a `caption` field - no changes needed. The layouts will render captions when present. Caption editing UI is out of scope for this plan.

### Image Dimensions

The Photo model already stores `width` and `height` for each image. Layouts that need dimensions upfront (Arc, Vibe) will use these values directly from the album data - no additional image loading required.

## Implementation Steps

### Step 1: Update Data Models (Small)

1. Add `Layout` and `LayoutSize` fields to Go Album struct
2. Add `AlbumLayout`, `LayoutSize` types and fields to TypeScript Album interface
3. Add `default_album_layout` to PortfolioConfig (Go + TypeScript)
4. No migration needed - new fields are optional with sensible defaults

### Step 2: Create Layout Components (Medium)

Create a new directory: `frontend/src/components/layouts/`

Each layout will be a Lit component that:

- Takes `photos: Photo[]` as a property
- Takes `size: LayoutSize` as a property (for arc, vibe, insta)
- Emits `photo-click` event when a photo is clicked
- Renders captions when `photo.caption` is present
- Uses `photo.width` and `photo.height` for dimension-dependent calculations

Components to create:

- `arc-layout.ts` - Justified layout (requires `justified-layout` npm package), respects size prop
- `vibe-layout.ts` - Masonry layout (requires `masonry-layout` + `imagesloaded` npm packages), respects size prop
- `insta-layout.ts` - Square grid (CSS grid, aspect-ratio: 1), respects size prop
- `fit-layout.ts` - Viewport-fit single column
- `big-layout.ts` - Full-width single column
- `original-layout.ts` - Wrapper around existing `photo-grid` component

Shared concerns:

- All use `lazy-image` component for image loading
- All emit standardized `photo-click` event
- Caption rendering as optional `<div class="caption">` below images
- Use stored `photo.width` / `photo.height` for aspect ratios (no runtime image loading)

### Step 3: Create Layout Switcher Component (Small)

Create `frontend/src/components/layout-renderer.ts`:

```typescript
@customElement('layout-renderer')
export class LayoutRenderer extends LitElement {
  @property({ type: Array }) photos: Photo[] = [];
  @property({ type: String }) layout: AlbumLayout = 'arc';
  @property({ type: String }) size: LayoutSize = 'large';

  render() {
    switch (this.layout) {
      case 'arc':
        return html`<arc-layout .photos=${this.photos} .size=${this.size}></arc-layout>`;
      case 'vibe':
        return html`<vibe-layout .photos=${this.photos} .size=${this.size}></vibe-layout>`;
      case 'insta':
        return html`<insta-layout .photos=${this.photos} .size=${this.size}></insta-layout>`;
      case 'fit':
        return html`<fit-layout .photos=${this.photos}></fit-layout>`;
      case 'big':
        return html`<big-layout .photos=${this.photos}></big-layout>`;
      case 'original':
        return html`<original-layout .photos=${this.photos}></original-layout>`;
    }
  }
}
```

### Step 4: Update Album Detail Page (Small)

Modify [album-detail-page.ts](../../frontend/src/pages/album-detail-page.ts):

Replace:

```typescript
<photo-grid .photos=${this.album.photos} .layout=${'masonry'}></photo-grid>
```

With:

```typescript
<layout-renderer
  .photos=${this.album.photos}
  .layout=${this.album.layout || this.siteConfig?.portfolio.default_album_layout || 'arc'}
  .size=${this.album.layout_size || 'large'}
></layout-renderer>
```

### Step 5: Update Admin Album Editor (Small)

Add layout dropdown to [admin-album-editor-page.ts](../../frontend/src/pages/admin-album-editor-page.ts):

Add after the visibility dropdown in the settings form:

```typescript
<div class="form-row">
  <div class="form-group">
    <label for="layout">Photo Layout</label>
    <select
      id="layout"
      .value=${this.album.layout || this.siteConfig?.portfolio.default_album_layout || 'arc'}
      @change=${(e: Event) => {
        const value = (e.target as HTMLSelectElement).value as AlbumLayout;
        this.updateField('layout', value);
        void this.autoSave();
      }}
    >
      <option value="arc">Arc (Justified rows)</option>
      <option value="vibe">Vibe (Masonry columns)</option>
      <option value="insta">Insta (Square grid)</option>
      <option value="fit">Fit (Viewport scroll)</option>
      <option value="big">Big (Full width)</option>
      <option value="original">Original (Current grid)</option>
    </select>
  </div>

  ${['arc', 'vibe', 'insta'].includes(this.album.layout || 'arc')
    ? html`
      <div class="form-group">
        <label for="layout_size">Layout Size</label>
        <select
          id="layout_size"
          .value=${this.album.layout_size || 'large'}
          @change=${(e: Event) => {
            const value = (e.target as HTMLSelectElement).value as LayoutSize;
            this.updateField('layout_size', value);
            void this.autoSave();
          }}
        >
          <option value="large">Large (fewer, bigger images)</option>
          <option value="small">Small (more, smaller images)</option>
        </select>
      </div>
    `
    : html`<div class="form-group"></div>`}
</div>
```

### Step 6: Add npm Dependencies (Small)

```bash
cd frontend && npm install justified-layout masonry-layout imagesloaded
```

- `justified-layout` - Flickr's open-source justified layout algorithm (Arc layout)
- `masonry-layout` - Desandro's masonry grid library (Vibe layout)
- `imagesloaded` - Ensures masonry layout runs after images load

## File Changes Summary

| File                                                 | Change Type | Description                          |
| ---------------------------------------------------- | ----------- | ------------------------------------ |
| `backend/internal/models/album.go`                   | Modify      | Add `Layout`, `LayoutSize` fields    |
| `backend/internal/models/site_config.go`             | Modify      | Add `DefaultAlbumLayout` field       |
| `frontend/src/types/data-models.ts`                  | Modify      | Add layout types + fields            |
| `frontend/src/components/layouts/arc-layout.ts`      | Create      | Justified layout (with size support) |
| `frontend/src/components/layouts/vibe-layout.ts`     | Create      | Masonry layout (with size support)   |
| `frontend/src/components/layouts/insta-layout.ts`    | Create      | Square grid (with size support)      |
| `frontend/src/components/layouts/fit-layout.ts`      | Create      | Viewport-fit component               |
| `frontend/src/components/layouts/big-layout.ts`      | Create      | Full-width component                 |
| `frontend/src/components/layouts/original-layout.ts` | Create      | Wrapper for existing photo-grid      |
| `frontend/src/components/layout-renderer.ts`         | Create      | Layout switcher component            |
| `frontend/src/pages/album-detail-page.ts`            | Modify      | Use layout-renderer                  |
| `frontend/src/pages/admin-album-editor-page.ts`      | Modify      | Add layout + size dropdowns          |
| `frontend/package.json`                              | Modify      | Add layout dependencies              |

**npm dependencies to add:**

- `justified-layout` - Arc layout
- `masonry-layout` - Vibe layout
- `imagesloaded` - Vibe layout (wait for images before layout)

## Risks

1. **Responsive breakpoints**: Each layout needs responsive CSS. Will port breakpoints from experimental playground.

2. **Caption height calculation**: Arc layout modifies aspect ratios when captions are present. Experimental code handles this - will adapt.

## Out of Scope

- Caption editing UI (just display support)
- Layout preview in admin editor
- Animation between layouts
- Per-photo layout overrides

## Testing Checklist

- [ ] New album defaults to site config's `default_album_layout` (which defaults to 'arc')
- [ ] Existing albums continue working (no layout = use site default)
- [ ] Global default layout setting works in admin settings
- [ ] Per-album layout override works
- [ ] Each layout renders correctly with various photo aspect ratios
- [ ] Photo click navigation works in all layouts
- [ ] Captions display when present
- [ ] Admin dropdown updates album layout
- [ ] Layout persists after page reload
- [ ] Responsive behavior on mobile/tablet
- [ ] Original layout matches current photo-grid behavior
- [ ] Layout size option (small/large) works for Arc, Vibe, Insta
- [ ] Size dropdown only shows when applicable layout is selected
- [ ] Small size shows more/smaller images, large shows fewer/bigger
