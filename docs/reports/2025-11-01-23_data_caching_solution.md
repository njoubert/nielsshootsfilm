# Data Caching Solution

## The Problem

The photography portfolio uses a hybrid architecture where:

1. **Admin backend** (Go) writes to JSON files in `/data/` directory
2. **Public frontend** (static HTML/JS) reads these JSON files directly

When admin makes updates:

- JSON files are updated immediately on disk
- Browser caches the old JSON files
- nginx may also cache static files
- Users don't see updates without hard refresh (Cmd+Shift+R)
- Private/incognito browsers see fresh data (no cache)

## Root Causes

### 1. Browser HTTP Cache

- Browsers cache `GET` requests to static resources by default
- `/data/albums.json` and `/data/site_config.json` are cached
- Even page refresh (F5) may serve from cache

### 2. nginx Static File Cache

- nginx can cache static files aggressively
- Default behavior varies by configuration
- Must explicitly set `Cache-Control` headers

### 3. No Cache Invalidation

- Static URLs don't change when content updates
- No version number or hash in filename
- No mechanism to tell browsers "this changed"

## The Solution

We implement a **multi-layer cache-busting strategy**:

### 1. Frontend: Query Parameter Cache Busting

**File**: `frontend/src/utils/api.ts`

```typescript
function cacheBustUrl(url: string): string {
  const timestamp = Date.now();
  return `${url}?_=${timestamp}`;
}

// Applied to all data fetches:
fetch(cacheBustUrl('/data/albums.json'));
fetch(cacheBustUrl('/data/site_config.json'));
```

**How it works**:

- Appends unique timestamp to each request: `/data/albums.json?_=1699000000000`
- Browser sees this as a different URL each time
- Forces fresh fetch every time
- Simple and effective for frequently-changing data

**Trade-offs**:

- ✅ Simple implementation
- ✅ Works immediately, no server config needed
- ✅ Compatible with all browsers
- ⚠️ Disables all caching (minor performance impact)
- ⚠️ Every request hits the server

### 2. Vite Dev Server: No-Cache Headers

**File**: `frontend/vite.config.ts`

```typescript
server.middlewares.use('/data', (req, res, next) => {
  // Serve data files with no-cache headers
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  // ... serve file
});
```

**Purpose**: Ensures development environment behaves like production

### 3. nginx: Production Configuration

**File**: `docs/deployment/deploy_frontend.md`

```nginx
# Don't cache data files - they may be updated by admin
location /data/ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
    add_header Expires "0";
}

# Cache static assets aggressively
location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

**Strategy**:

- Data files (`/data/*.json`): No caching
- Static assets (`/assets/*.js`, `/uploads/*.jpg`): Long-term caching
- Optimal balance of performance and freshness

## Testing the Solution

### Development Testing

```bash
# Start servers
./dev.sh

# 1. Make an update via admin
# 2. Navigate to public page
# 3. Check browser Network tab - should see ?_=timestamp in URLs
# 4. Verify fresh data loads immediately
```

### Production Testing

After deploying:

1. **Update nginx config** with the `/data/` location block
2. **Reload nginx**: `sudo nginx -s reload`
3. **Clear browser cache** or open private window
4. **Make admin changes** and verify they appear immediately

### Verification Checklist

- [ ] Browser Network tab shows `?_=timestamp` on data requests
- [ ] Response headers show `Cache-Control: no-cache...`
- [ ] Updates appear without hard refresh
- [ ] Different browsers/devices see updates
- [ ] No stale data after logout/login

## Alternative Approaches Considered

### 1. ETag/Last-Modified Headers

- **Pros**: Conditional requests, bandwidth efficient
- **Cons**: Requires server-side logic, still hits server for 304 responses
- **Verdict**: More complex, marginal benefit for small JSON files

### 2. Service Worker Cache Invalidation

- **Pros**: Full control over caching strategy
- **Cons**: Complex, requires service worker, harder to debug
- **Verdict**: Overkill for this use case

### 3. Versioned Filenames (`albums-v123.json`)

- **Pros**: Perfect caching, browser never checks stale files
- **Cons**: Requires build step, coordinating versions, cleanup old files
- **Verdict**: Too complex for admin-updated data

### 4. WebSocket Push Updates

- **Pros**: Real-time updates, no polling
- **Cons**: Significant architecture change, requires persistent connection
- **Verdict**: Way beyond MVP scope

## Performance Impact

### Before (Cached)

- First load: `albums.json` (~10-50 KB)
- Subsequent loads: 0 bytes (from cache)

### After (Cache-Busting)

- Every load: `albums.json` (~10-50 KB)

**Impact Analysis**:

- Typical JSON files: 10-50 KB
- On typical broadband (10 Mbps): ~10ms additional latency
- **Acceptable trade-off** for data freshness in admin workflow

**Mitigation**:

- Images still heavily cached (largest bandwidth)
- CSS/JS bundles still cached
- Only JSON data refetched

## Future Improvements

If caching becomes a performance issue:

1. **Hybrid approach**: Cache-bust only after admin updates

   - Track last update timestamp
   - Include in URL: `?v=last_update_timestamp`
   - Allows caching between updates

2. **Version field in JSON**:

   - Backend increments version on each write
   - Frontend polls for version changes
   - Only refetch when version changes

3. **Server-Sent Events**:
   - Backend pushes update notifications
   - Frontend only refetches on notification

## Related Files

### Implementation

- `frontend/src/utils/api.ts` - Cache-busting logic
- `frontend/vite.config.ts` - Dev server headers
- `backend/internal/middleware/cache.go` - Backend middleware

### Tests

- `frontend/src/utils/api.test.ts` - Frontend tests
- `backend/internal/middleware/cache_test.go` - Backend tests

### Documentation

- `docs/deployment/deploy_frontend.md` - nginx configuration
- `.github/copilot-instructions.md` - Architecture notes

## Troubleshooting

### "Still seeing old data"

1. **Check browser DevTools Network tab**:

   - Verify `?_=` parameter present
   - Check response headers for `Cache-Control`
   - Look for 200 (not 304) status

2. **Clear browser cache**: Cmd+Shift+Delete (Chrome/Firefox)

3. **Check nginx config**: Verify `/data/` location block is present

4. **Restart nginx**: `sudo nginx -s reload`

### "Seeing too many requests"

This is expected! Cache-busting means every data fetch hits the server. If this becomes a problem, consider the hybrid approach above.

### "Admin updates not reflected"

1. Check backend logs - did write succeed?
2. Check file permissions on `/data/` directory
3. Verify atomic writes completed (no `.tmp` files)
4. Check nginx is serving from correct directory

## Summary

**Problem**: Browser/nginx caching prevents users from seeing admin updates immediately.

**Solution**: Multi-layer cache-busting with query parameters + no-cache headers.

**Result**: Users always see fresh data with minimal performance impact.

**Cost**: Small increase in bandwidth for JSON files (~10-50 KB per page load).

**Benefit**: Immediate visibility of admin changes across all users and devices.
