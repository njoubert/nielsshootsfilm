# Plan: Album Download Feature

## Update: Simple plan after ZIP profiling

I profiled how long it takes to zip files when using store-only, aka, no compression.
Even on the mac mini I can create a store-only zip file of the entire 6GB uploads directory in 15 seconds. The `tres hermanos` album with over 200 photos takes under 4 seconds.

This suggests to me that we likely want to start with a very simple approach that has none of the complexity of this plan:

- The user clicks on album download
- we take them to a download page, with the thumbnail of the cover photo.
- We give them three options - thumbnail quality, 4k display quality, or originals
- when they click to get the download, we spawn a request, put up a spinner saying 'preparing download...'
- on the backend, everything happens synchronously, we create the temporary zip file, and then the download starts.

### Implementation

**Complexity**: Small
**Estimated Effort**: 1-2 days

#### Backend (0.5 days)

1. **New endpoint**: `GET /api/albums/{slug}/download?quality={thumbnail|display|original}`

   - Check `allow_downloads` flag → 403 if false
   - Get album and photos from AlbumService
   - Determine photo directory based on quality parameter:
     - `thumbnail` → `/uploads/thumbnails/`
     - `display` → `/uploads/display/`
     - `original` → `/uploads/originals/`
   - Create ZIP synchronously using `archive/zip` with Store method (no compression)
   - Stream ZIP directly to HTTP response with headers:

     ```go
     Content-Type: application/zip
     Content-Disposition: attachment; filename="{album-slug}-{quality}.zip"
     ```

   - No temp files needed - stream directly from photo files to ZIP to response

2. **Error handling**:
   - Album not found → 404
   - Downloads disabled → 403 with clear message
   - Photo file missing → Skip photo, log warning, continue
   - Disk read errors → 500 with error message

#### Frontend (0.5-1 day)

1. **Album Detail Page** (`album-detail-page.ts`):

   - Add download button below hero image (only if `album.allow_downloads === true`)
   - Button links to `/albums/{slug}/download`

2. **Album Download Page** (`album-download-page.ts`):

   - URL: `/albums/{slug}/download`
   - Shows album cover thumbnail and title
   - Three quality options as buttons/links:
     - "Thumbnail Quality" → starts download for thumbnails
     - "Display Quality (4K)" → starts download for display versions
     - "Original Quality" → starts download for originals
   - On button click:
     - Show spinner overlay immediately with "Preparing download..."
     - Trigger download: `window.location.href = /api/albums/{slug}/download?quality={quality}`
     - Browser handles the download automatically
     - Spinner stays until browser starts download (user sees save dialog)
   - "Back to Album" button to return to album detail page
   - Check if downloads allowed on page load → show error if not

3. **Routing**:
   - Add route: `/albums/:slug/download` → `album-download-page`
   - Add to navigation helpers: `routes.albumDownload(slug)`

#### Key Simplifications

- **No async/polling**: Everything synchronous, browser handles download progress
- **No temp files**: Stream directly from source photos to ZIP to HTTP response
- **No caching**: Generate fresh every time (4 seconds for 200 photos is fast enough)
- **No status tracking**: Simple request/response, browser shows download progress
- **No cleanup jobs**: Nothing to clean up since we don't write temp files
- **Shareable links**: URLs like `/albums/my-trip/download?quality=original` can be shared directly

#### Testing

- [ ] Small album (5 photos) - all three qualities
- [ ] Large album (200+ photos) - all three qualities
- [ ] Album with downloads disabled
- [ ] Missing photo files (should skip and continue)
- [ ] Verify original filenames preserved in ZIP
- [ ] Test shareable download links work correctly

## Original Complex Plan

**Date**: November 2, 2025
**Status**: Approved - Ready for Implementation
**Complexity**: Large
**Estimated Effort**: Large (4-6 days)

## Configuration Decisions

- **Maximum album size**: 10GB
- **Compression**: None (store-only, photos already compressed)
- **Concurrent operations**: 1 (users wait on preparation page)
- **ZIP cache duration**: Configurable, default 24 hours (allows serving popular albums rapidly)

Enable users to download an entire album as a ZIP file containing original full-quality images with their original filenames.

## Current State

- ✅ Individual photo download works (original quality)
- ✅ Album visibility controls (`allow_downloads` flag exists)
- ❌ No bulk download capability
- ❌ No ZIP generation infrastructure

## Goals

1. **User Experience**: Simple, intuitive download flow with progress feedback
2. **Performance**: Async ZIP generation to avoid blocking the server
3. **Resource Management**: Automatic cleanup of temporary files
4. **Error Handling**: Graceful failures with clear messaging
5. **Security**: Respect `allow_downloads` flag, prevent abuse

## Proposed Architecture

### High-Level Flow

```text
User clicks download → Navigate to download page → Request ZIP creation
                                ↓
                Backend creates ZIP asynchronously
                                ↓
                Frontend polls for status (every 2s)
                                ↓
            ZIP ready → User downloads → Backend cleanup

Alternative: User clicks cancel → DELETE request → Backend stops ZIP creation → Cleanup
```

### Components

#### Frontend Components

1. **Album Detail Page Enhancement**

   - Add download button below hero image (right side)
   - Only show if `album.allow_downloads === true`
   - Links to `/albums/{slug}/download`

2. **Album Download Page** (new)
   - URL: `/albums/{slug}/download`
   - States:
     - **Preparing**: Shows spinner, album name, cover thumbnail
     - **Ready**: Shows download button
     - **Error**: Shows error message with reason
     - **Not Available**: Album doesn't allow downloads
   - Polls backend every 2 seconds for status

#### Backend Components

1. **ZIP Service** (new)

   - `GenerateAlbumZIP(albumID)`: Creates ZIP file
   - `GetZIPStatus(albumID)`: Returns preparation status
   - `ServeZIP(albumID)`: Streams ZIP to client
   - `CleanupZIP(albumID)`: Deletes temporary file

2. **API Endpoints** (new)

   - `POST /api/albums/{slug}/download/prepare`: Start ZIP creation
   - `GET /api/albums/{slug}/download/status`: Check if ready
   - `DELETE /api/albums/{slug}/download/cancel`: Cancel ZIP creation and cleanup
   - `GET /api/albums/{slug}/download/file`: Download the ZIP
   - All endpoints respect `allow_downloads` flag

3. **Temporary File Management**
   - Directory: `/tmp/album-downloads/` or configurable
   - Filename format: `{album-slug}-{timestamp}.zip`
   - Auto-cleanup after configured cache duration (default 24 hours)
   - Keep ZIPs after successful download to serve popular albums rapidly
   - **Cleanup on user cancellation**

## Detailed Design

### 1. Frontend: Download Button

**Location**: `frontend/src/pages/album-detail-page.ts`

```typescript
// Add below hero image, before photo grid
${album.allow_downloads
  ? html`
    <div class="album-actions">
      <a href=${routes.albumDownload(album.slug)} class="download-button">
        <svg><!-- download icon --></svg>
        Download Album as Zip File
      </a>
    </div>
  `
  : ''}
```

**Styling**: Subtle button, right-aligned, matches photo download style

### 2. Frontend: Download Page

**New File**: `frontend/src/pages/album-download-page.ts`

**States**:

```typescript
type DownloadState =
  | 'checking' // Initial check if downloads allowed
  | 'preparing' // ZIP being created
  | 'ready' // ZIP ready for download
  | 'downloading' // User clicked download
  | 'complete' // Download complete
  | 'cancelled' // User cancelled preparation
  | 'error' // Error occurred
  | 'not-available'; // Downloads disabled
```

**Key Methods**:

- `connectedCallback()`: Check if album exists and allows downloads
- `startZIPPreparation()`: Call backend to start ZIP creation
- `pollStatus()`: Poll every 2s until ready/error/cancelled
- `cancelPreparation()`: Call backend to cancel and cleanup ZIP
- `downloadZIP()`: Trigger browser download
- `handleError()`: Display error messages

**UI Elements**:

- Album cover thumbnail (from existing data)
- Album title
- Loading spinner (reuse `<loading-spinner>`)
- Status text ("Preparing download...", "Ready!", "Error: ...")
- Download button (only when ready)
- **Cancel button** (when preparing - sends cancel request to backend)
- Back button (when ready/error/cancelled)

### 3. Backend: ZIP Service

**New File**: `backend/internal/services/zip_service.go`

```go
type ZIPService struct {
    albumService  *AlbumService
    uploadDir     string
    tempDir       string
    logger        *slog.Logger
}

type ZIPStatus struct {
    State       string    // "preparing", "ready", "cancelled", "error"
    Progress    int       // 0-100
    Error       string    // Error message if failed
    FilePath    string    // Path to ZIP file (internal)
    DownloadURL string    // URL to download (external)
    CreatedAt   time.Time
    ExpiresAt   time.Time
}

// In-memory tracking of active ZIP jobs
type zipJob struct {
    AlbumID   string
    Status    ZIPStatus
    Done      chan struct{}
    Cancel    chan struct{}  // Signal to cancel operation
    mu        sync.RWMutex
}

var activeJobs = make(map[string]*zipJob)
var jobsMu sync.RWMutex
```

**Key Methods**:

1. **`PrepareZIP(albumID string) error`**

   - Validate album exists and allows downloads
   - Check if ZIP already being prepared (deduplicate requests)
   - Start goroutine for async ZIP creation
   - Return immediately

2. **`CreateZIP(albumID string) error`** (internal, runs async)

   - Get album and photos from AlbumService
   - Create temp directory if not exists
   - Generate ZIP filename: `{album-slug}-{timestamp}.zip`
   - Iterate through photos:
     - **Check cancel channel** before processing each photo
     - Read original file from `/uploads/originals/`
     - Add to ZIP with original filename
     - Update progress (for future enhancement)
   - Mark as ready when complete
   - Set expiry time (configurable, default 24 hours from creation)
   - **If cancelled: Clean up partial ZIP and mark as cancelled**

3. **`GetStatus(albumID string) (*ZIPStatus, error)`**

   - Look up job in activeJobs map
   - Return current status

4. **`CancelZIP(albumID string) error`** (new)

   - Look up job in activeJobs map
   - Send signal on Cancel channel (non-blocking)
   - Wait for CreateZIP to acknowledge cancellation
   - Delete partial ZIP file
   - Remove from activeJobs map
   - Return success

5. **`ServeZIP(albumID string) (io.ReadCloser, string, error)`**

   - Verify ZIP is ready
   - Open file for reading
   - Return reader, filename, error
   - Mark for cleanup after serving

6. **`CleanupZIP(albumID string) error`**

   - Delete ZIP file
   - Remove from activeJobs map

7. **`CleanupExpiredZIPs()`** (background job)
   - Run periodically (every 15 minutes)
   - Delete ZIPs older than configured cache duration (default 24 hours)
   - Clean up activeJobs map

**Cancellation Mechanism**:

The cancellation system uses Go channels for thread-safe communication:

1. **Cancel Channel**: Each `zipJob` has a `Cancel chan struct{}` channel
2. **Check Before Each Photo**: `CreateZIP` checks the cancel channel before processing each photo:

   ```go
   select {
   case <-job.Cancel:
       // Cancel signal received
       os.Remove(partialZipPath)  // Delete partial ZIP
       job.Status.State = "cancelled"
       return nil
   default:
       // Continue processing
   }
   ```

3. **Non-blocking Signal**: `CancelZIP` sends on the channel without blocking:

   ```go
   select {
   case job.Cancel <- struct{}{}:
       // Signal sent
   default:
       // Already cancelled or channel full
   }
   ```

4. **Graceful Cleanup**: After cancellation, the partial ZIP is deleted and job is removed from tracking

**Error Handling**:

- Album not found → 404
- Downloads disabled → 403
- Photo files missing → Skip photo, log warning
- Disk space issues → Error with clear message
- **User cancellation → Clean up partial ZIP, mark as cancelled**
- Concurrent requests → Reuse existing job

### 4. Backend: API Handlers

**New File**: `backend/internal/handlers/download_handler.go`

```go
type DownloadHandler struct {
    albumService *AlbumService
    zipService   *ZIPService
    logger       *slog.Logger
}
```

**Endpoints**:

1. **`POST /api/albums/{slug}/download/prepare`**

   - Public endpoint (no auth required)
   - Get album by slug
   - Check `allow_downloads` flag → 403 if false
   - Call `zipService.PrepareZIP(albumID)`
   - Return 202 Accepted with status URL

2. **`GET /api/albums/{slug}/download/status`**

   - Public endpoint
   - Get album by slug
   - Call `zipService.GetStatus(albumID)`
   - Return JSON status

3. **`DELETE /api/albums/{slug}/download/cancel`** (new)

   - Public endpoint
   - Get album by slug
   - Call `zipService.CancelZIP(albumID)`
   - Return 200 OK with cancellation confirmation
   - If no active job, return 404

4. **`GET /api/albums/{slug}/download/file`**

   - Public endpoint
   - Get album by slug
   - Verify ZIP is ready
   - Call `zipService.ServeZIP(albumID)`
   - Stream ZIP file with proper headers:

     ```go
     Content-Type: application/zip
     Content-Disposition: attachment; filename="{album-slug}.zip"
     ```

   - Schedule cleanup after successful transfer

**Response Formats**:

```json
// Status response
{
  "state": "preparing",
  "progress": 45,
  "download_url": "/api/albums/my-album/download/file",
  "estimated_size_mb": 150
}

// Ready response
{
  "state": "ready",
  "progress": 100,
  "download_url": "/api/albums/my-album/download/file",
  "file_size_mb": 142
}

// Error response
{
  "state": "error",
  "error": "Failed to read photo file: photo-123.jpg"
}

// Cancelled response
{
  "state": "cancelled",
  "message": "Download preparation cancelled by user"
}
```

### 5. Frontend: API Client

**File**: `frontend/src/utils/api.ts`

Add functions:

```typescript
export async function prepareAlbumDownload(slug: string): Promise<void> {
  const response = await fetch(`/api/albums/${slug}/download/prepare`, {
    method: 'POST',
  });
  if (!response.ok) throw new Error('Failed to prepare download');
}

export async function getDownloadStatus(slug: string): Promise<DownloadStatus> {
  const response = await fetch(`/api/albums/${slug}/download/status`);
  if (!response.ok) throw new Error('Failed to get status');
  return response.json();
}

export async function cancelAlbumDownload(slug: string): Promise<void> {
  const response = await fetch(`/api/albums/${slug}/download/cancel`, {
    method: 'DELETE',
  });
  if (!response.ok) throw new Error('Failed to cancel download');
}

export function getDownloadURL(slug: string): string {
  return `/api/albums/${slug}/download/file`;
}
```

### 6. Routing

**Frontend**: Add to `frontend/src/utils/router.ts`

```typescript
{
  path: '/albums/:slug/download',
  component: 'album-download-page',
  title: 'Download Album',
}
```

**Backend**: Add to `backend/cmd/admin/main.go`

```go
// Public download endpoints (no auth required)
r.Route("/api/albums/{slug}/download", func(r chi.Router) {
    r.Post("/prepare", downloadHandler.PrepareDownload)
    r.Get("/status", downloadHandler.GetStatus)
    r.Delete("/cancel", downloadHandler.CancelDownload)
    r.Get("/file", downloadHandler.ServeFile)
})
```

## Implementation Phases

### Phase 1: Backend Foundation (Day 1-2)

1. ✅ Create `ZIPService` with basic structure
2. ✅ Implement `PrepareZIP()` and `CreateZIP()`
3. ✅ Implement `GetStatus()`
4. ✅ Add temporary directory management
5. ✅ Write unit tests for ZIP creation
6. ✅ Add cleanup logic

### Phase 2: Backend API (Day 2)

1. ✅ Create `DownloadHandler`
2. ✅ Implement three endpoints
3. ✅ Add to router
4. ✅ Test with curl/Postman

### Phase 3: Frontend Page (Day 3)

1. ✅ Create `album-download-page.ts`
2. ✅ Implement state machine
3. ✅ Add polling logic
4. ✅ Style the page
5. ✅ Add to router

### Phase 4: Frontend Integration (Day 3-4)

1. ✅ Add download button to album detail page
2. ✅ Update API utility functions
3. ✅ Add navigation helpers
4. ✅ Test full flow

### Phase 5: Polish & Testing (Day 4-5)

1. ✅ Add progress indicators
2. ✅ Error handling improvements
3. ✅ Background cleanup job
4. ✅ E2E testing
5. ✅ Performance testing with large albums
6. ✅ Documentation

## Technical Considerations

### Performance

**Concern**: Large albums may take significant time to ZIP

**Mitigations**:

- Async processing (non-blocking)
- Stream directly from disk to ZIP (no double buffering)
- Use Go's `archive/zip` with streaming
- **No compression** (Store method): Photos already compressed, faster processing

**Benchmarks to establish**:

- 10 photos (~50MB): < 5 seconds
- 50 photos (~250MB): < 20 seconds
- 200 photos (~1GB): < 60 seconds
- 1000 photos (~5GB): < 5 minutes

### Resource Management

**Disk Space**:

- ZIP files stored in `/tmp/album-downloads/`
- Size approximately equals sum of original photo sizes
- Cleanup after a configurable amount of hours (24 hours default).
- On successful download - don't clean up immediately, keep the zip file around for an hour in case someone else were to try and download the same album. This speeds up popular album downloads.
- Monitor disk usage (don't allow if < 500MB free)

**Memory**:

- Stream files to ZIP (don't load all in memory)
- **Limit concurrent ZIP operations to 1** (simpler, users wait on preparation page anyway)

**Concurrency**:

- Single ZIP operation at a time (semaphore, max 1)
- Multiple users downloading same album (within the same hour expiration) -> reuse same zip file.
- Track active jobs in memory map
- Use mutex for thread safety

**Security**

**Concerns**:

1. Path traversal in filenames
2. Respect `allow_downloads` flag
3. Temporary file cleanup

**Mitigations**:

1. Validate all filenames (already done in ImageService)
2. Check flag on every endpoint
3. Background cleanup job + on-download cleanup

### Error Handling

**Scenarios**:

1. Album doesn't exist → 404
2. Downloads disabled → 403 with clear message
3. Photo file missing → Skip, log warning, continue
4. Disk space full → Error before starting
5. ZIP creation fails → Clean state, allow retry
6. User navigates away → Continue preparation, cleanup later
7. **User cancels → Stop ZIP creation immediately, cleanup partial file**

### Browser Compatibility

**Download Trigger**:

- Use simple `<a href="..." download>` link
- Browser handles download progress
- No JavaScript download tricks needed

**Polling**:

- Standard `setInterval()` every 2 seconds
- Clear interval on unmount
- Clear interval on ready/error

## Risks & Unknowns

## Testing Strategy

### Unit Tests

- `ZIPService.CreateZIP()` with mock album
- Verify ZIP contains all photos
- Verify original filenames preserved
- Test error handling (missing files)
- Test cleanup logic

### Integration Tests

- End-to-end API flow:
  1. POST prepare
  2. Poll status until ready
  3. GET file
  4. Verify cleanup

### Manual E2E Testing

- [ ] Small album (5 photos, ~10MB)
- [ ] Medium album (50 photos, ~100MB)
- [ ] Large album (200 photos, ~500MB)
- [ ] Album with downloads disabled
- [ ] **Cancel during preparation (small album)**
- [ ] **Cancel during preparation (large album, mid-way)**
- [ ] Concurrent downloads (same album)
- [ ] Concurrent downloads (different albums)
- [ ] Network interruption during download
- [ ] Server restart during ZIP creation
- [ ] Browser refresh during preparation

### Performance Testing

- Measure ZIP creation time vs album size
- Monitor CPU/memory during creation
- Test with max concurrent operations

## Configuration

Add to `site_config.json`:

```json
{
  "downloads": {
    "enabled": true,
    "max_concurrent_zips": 1,
    "zip_cache_hours": 24,
    "temp_directory": "/tmp/album-downloads",
    "max_album_size_mb": 10240
  }
}
```

**Note**: `zip_cache_hours` controls how long ZIPs are kept after creation. This allows serving popular albums rapidly without regenerating. Set to 1 for faster cleanup, or increase to 24+ for better caching of popular albums.

## Future Enhancements

**Phase 2** (post-MVP):

- [ ] Progress bar (show N/M photos zipped)
- [ ] Estimated time remaining
- [ ] Download history in admin panel
- [ ] Resume capability for interrupted downloads
- [ ] Multiple quality options (original, display, thumbnail)
- [ ] **Content versioning for concurrent edits**

### Phase 2: Concurrent Album Edit Handling

**Problem**: If the admin modifies an album (add/remove/reorder photos) while ZIP generation is in progress:

1. The specific person's ZIP may be corrupted (missing/extra files)
2. If we cache the ZIP, subsequent users will get an outdated version
3. No way to detect when cached ZIPs are stale

**Solution**: Content-based hashing and versioning

**Implementation approach**:

```go
// Generate content hash from album metadata
func (s *ZIPService) generateAlbumHash(album models.Album) string {
    hasher := sha256.New()

    // Include all album properties that affect ZIP content
    hasher.Write([]byte(album.ID))
    hasher.Write([]byte(album.UpdatedAt))

    // Hash photo list (order matters!)
    for _, photo := range album.Photos {
        hasher.Write([]byte(photo.ID))
        hasher.Write([]byte(photo.Filename))
    }

    return hex.EncodeToString(hasher.Sum(nil))[:16] // First 16 chars
}

// Use hash in ZIP filename
filename := fmt.Sprintf("%s-%s.zip", album.Slug, hash)
```

**Key changes**:

1. **Include hash in filename**: `/tmp/zips/{album-slug}-{hash}.zip`
2. **Check hash on request**:
   - Compute current album hash
   - If cached ZIP exists with matching hash → serve it
   - If hash mismatch → cached ZIP is stale, generate new one
3. **On album edit**:
   - Cancel any in-progress ZIP jobs for that album
   - Delete all cached ZIPs for that album (old hashes)
4. **Cleanup**: Remove ZIPs older than the configred expiration duration AND with stale hashes

**Benefits**:

- Deterministic: Same album content = same hash = same ZIP
- Automatic invalidation: Album edits produce new hash
- Safe: No risk of serving stale content
- Efficient: Cache hit when album unchanged

**Complexity**: Medium (2-3 days)

- Hash computation (~2 hours)
- Filename management updates (~4 hours)
- Cache invalidation logic (~8 hours)
- Testing edge cases (~2 hours)

## Documentation Needs

### Go Packages

- `archive/zip` (stdlib) - ZIP creation
- `path/filepath` (stdlib) - Path handling
- `io` (stdlib) - Streaming
- `sync` (stdlib) - Concurrency

### Frontend

- Existing components (`loading-spinner`, `lazy-image`)
- Existing utilities (`api.ts`, `router.ts`, `navigation.ts`)

### External

- None! All stdlib

## Success Criteria

- [ ] Users can download albums as ZIP files
- [ ] Original filenames preserved
- [ ] Process doesn't block server
- [ ] Automatic cleanup works reliably
- [ ] **Cancellation works correctly and cleans up partial files**
- [ ] Respects `allow_downloads` flag
- [ ] Clear error messages
- [ ] Works reliably with albums up to 10GB
- [ ] All tests pass
- [ ] Documentation complete

## Questions for User

1. **Size limits**: What's the maximum album size we should support? → **ANSWERED: 10GB**
2. **Compression**: Should we compress the ZIP or use store-only? → **ANSWERED: Store-only (no compression)**
3. **Concurrent limit**: How many simultaneous ZIP operations? → **ANSWERED: 1 concurrent operation**
4. **Cleanup timing**: How long should ZIPs be cached? → **ANSWERED: Configurable, default 24 hours (allows serving popular albums rapidly)**

## Next Steps

1. ✅ Review plan with user
2. ⏸️ Answer open questions
3. ⏸️ Create implementation tasks
4. ⏸️ Begin Phase 1 implementation
