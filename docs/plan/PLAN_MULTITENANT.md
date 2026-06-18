# Multi-Tenant Refactor Plan ("C-local")

> Status: PROPOSED — not yet started.
> Audience: the engineer/agent implementing this. Read the whole document once before writing any code.
> Companion docs: [PLAN_MVP.md](../PLAN_MVP.md), [backend/README.md](../../backend/README.md), [README.md](../../README.md).

## 1. Goal

Turn this single-person photo portfolio into a platform where **dozens** of people **can**
each run their own portfolio site, addressed by **subdomain**
(`alice.nielsshootsfilm.com`), all served by **one** backend codebase and **one**
nginx instance.

Host model:

- **`nielsshootsfilm.com`** (apex + `www`) **stays the operator's own portfolio.** It is
  just a normal tenant (slug `niels`) that happens to be served at the bare domain. Niels's
  existing URLs and SEO are fully preserved — nothing about his live site moves.
- **`join.nielsshootsfilm.com`** is a reserved host for the **platform**:
  1. A public **landing page** explaining what the platform is.
  2. A private **platform-admin page** (only the operator, Niels, has the password)
     for creating / listing / deleting tenants.
- **`<slug>.nielsshootsfilm.com`** — every other tenant's portfolio + admin.

Each tenant gets the existing portfolio + admin experience, scoped to their own data.

## 2. Non-negotiable architectural property ("C-local")

**The public site must keep working when the Go backend is down.**

This is the whole reason we chose this approach. Concretely:

- **nginx serves all public content statically** from per-tenant directories on disk
  (the SPA shell, each tenant's `data/*.json`, and each tenant's `uploads/*`).
- The **Go backend is never in the read path** for public visitors. It is only needed
  for: admin login/editing, photo upload/processing, password-protected album access,
  ZIP downloads, and tenant management.
- If the Go process crashes, every public portfolio still loads. Only editing and
  password-gated features pause.

**Guardrail:** Do not "temporarily" route public reads through Go to simplify a phase.
If a phase needs that, stop and re-plan. nginx is the public server; Go is the editor.

## 3. The other key idea: private vs public data split

Today there is exactly one `albums.json`, it is served directly to the public, and it
**leaks** `password_hash` values and the existence of hidden albums (the `Album` model
serializes `password_hash`, and unlisted/password-protected albums sit in the same
array — see [backend/internal/models/album.go](../../backend/internal/models/album.go)).

In the new design every tenant has **two representations** of its data:

| Representation              | Location                           | Contents                                                                          | Who reads it                            |
| --------------------------- | ---------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------- |
| **Authoritative (private)** | `PRIVATE_DATA_DIR/tenants/<slug>/` | Everything: full albums incl. `password_hash`, all visibilities, full site config | Go backend only (never served by nginx) |
| **Published (public)**      | `SITES_DIR/tenants/<slug>/data/`   | Sanitized: secrets stripped, password-protected albums omitted                    | nginx serves directly to visitors       |

Every admin write follows: **write authoritative → regenerate published copy**. The
published directory is, by construction, safe to expose and safe to copy out as a static
export.

### 3.1 Sanitization rules (define once, use everywhere)

Implement a pure function `Publish(authoritative) -> published` for albums and site config.
Rules for the published `albums.json`:

- **Always** clear `password_hash` (set to `""`/omit) on every album.
- **Include** albums with visibility `public` and `unlisted`. (Unlisted must still load
  via direct link; the listing page already filters to `public` only, so unlisted stays
  unlisted by not appearing in listings.)
- **Omit entirely** albums with visibility `password_protected` — their slug, title,
  photos, nothing. They never appear in any published file. Their data is served on demand
  by Go only after the password is checked (see §6.7 for the load/share flow). This is the
  deliberate design: it keeps protected album data off the static disk and leaves the door
  open to also gating the image bytes later (Phase 7) without any redesign. Password-
  protected albums therefore require the backend to be up — accepted trade-off.
- Everything else (photos, EXIF, layout, etc.) is copied as-is.

Rules for published `site_config.json`:

- Copy as-is. It contains no secrets today. (Optional: strip `owner.phone` if desired —
  leave a clearly-marked TODO, do not gold-plate.)

Never write `users.json`, `admin_config.json`, the tenant registry, or anything under
`PRIVATE_DATA_DIR` into a published directory.

> **Known limitation (acceptable for now, hardened later in Phase 7):** the image _files_
> for a password-protected album still live in the public `uploads/` dir and are
> reachable by anyone who knows the exact URL (this is also true today). Phase 7 covers
> gating image bytes through Go. Do not block earlier phases on this.

## 4. Target on-disk layout

```text
PRIVATE_DATA_DIR/                         # never served by nginx
  platform/
    tenants.json                          # tenant registry (incl. per-tenant quota_mb)
    users.json                            # all users (platform admin + tenant admins)
    platform_config.json                  # machine-global storage settings (§14)
    .backups/                             # FileService backups
  tenants/
    niels/
      albums.json                         # authoritative (has password_hash, all albums)
      site_config.json
      blog_posts.json
      .backups/
    alice/
      ...

SITES_DIR/                                # served by nginx (public, sanitized)
  tenants/
    niels/
      data/
        albums.json                       # published (sanitized)
        site_config.json
      uploads/
        originals/  display/  thumbnails/
    alice/
      data/ ...
      uploads/ ...

APP_DIR/                                   # the shared compiled SPA shell (one copy)
  index.html
  assets/index-*.js  index-*.css
```

Conventions:

- **Tenant slug == subdomain == directory name.** Slug must match `^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$`
  and must not collide with reserved names (`join`, `www`, `admin`, `api`, `static`,
  `assets`). The bare apex is served as the reserved tenant slug `niels`.
- Adding a tenant = create `PRIVATE_DATA_DIR/tenants/<slug>/` and
  `SITES_DIR/tenants/<slug>/{data,uploads}/` and register it. **No nginx change, no DNS
  change, no new cert** (wildcard handles it).

## 5. nginx model

One wildcard TLS cert for `*.nielsshootsfilm.com` + `nielsshootsfilm.com`.

**Three** server blocks (see [deployment/nielsshootsfilm.nginx.conf](../../deployment/nielsshootsfilm.nginx.conf)
for the current single-site version to adapt). nginx matches exact `server_name`s before
regex ones, so the apex and `join` blocks always win over the wildcard.

**(a) Tenant subdomains** — captures the subdomain into `$sub`, serves the shared shell,
and serves per-tenant `data/` + `uploads/` from that tenant's directory:

```nginx
server {
    listen 443 ssl;
    http2 on;
    server_name ~^(?<sub>[a-z0-9-]+)\.nielsshootsfilm\.com$;

    # shared SPA shell
    root /srv/app;
    index index.html;

    location ^~ /api/ {
        proxy_pass http://localhost:6180;
        proxy_set_header Host $host;            # backend derives tenant from Host
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 110M;
        proxy_request_buffering off;
        proxy_read_timeout 600s;
    }

    # per-tenant published data (no caching — admin updates it)
    location ^~ /data/ {
        root /srv/tenants/$sub;               # => /srv/tenants/<sub>/data/...
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }

    # per-tenant uploads (cache hard — content-addressed-ish)
    location ^~ /uploads/ {
        root /srv/tenants/$sub;               # => /srv/tenants/<sub>/uploads/...
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback from shared shell
    location / { try_files $uri /index.html; }
}
```

**(b) Apex (operator's portfolio)** — `nielsshootsfilm.com` / `www.nielsshootsfilm.com`:
identical to a tenant block but hard-wired to the `niels` directory. Same shell, same
`/api/` proxy, but `/data/` and `/uploads/` use `root /srv/tenants/niels;` (literal, not
`$sub`). This is what keeps Niels's site at the bare domain.

**(c) Platform host** — `join.nielsshootsfilm.com`: serves the same shell (landing +
platform admin) and proxies `/api/` to Go. **No** `/data/` or `/uploads/` location — the
platform host has no portfolio content; platform-admin data comes via the API.

Notes / guardrails:

- If `/srv/tenants/$sub` does not exist, nginx returns 404 for `/data` and `/uploads` —
  acceptable. The SPA should show a friendly "site not found" if `site_config.json` 404s.
- Keep `SITES_DIR` (`/srv/tenants`) and `PRIVATE_DATA_DIR` on the **same filesystem** as
  the Go process so publishes are local file writes (no sync step).
- `PRIVATE_DATA_DIR` must **not** be under any nginx `root`. Double-check this.

## 6. Backend refactor

### 6.1 New models

`backend/internal/models/tenant.go`:

```go
type Tenant struct {
    ID          string    `json:"id"`           // uuid
    Slug        string    `json:"slug"`         // subdomain + dir name, unique
    DisplayName string    `json:"display_name"`
    Status      string    `json:"status"`       // "active" | "suspended"
    QuotaMB     int       `json:"quota_mb"`     // default 10240 (10 GB) on create; 0 = unlimited. See §14
    OwnerUserID string    `json:"owner_user_id"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}
type TenantRegistry struct { Tenants []Tenant `json:"tenants"` }
```

`backend/internal/models/platform_config.go` — machine-global settings (see §14), stored
at `PRIVATE_DATA_DIR/platform/platform_config.json`:

```go
type PlatformConfig struct {
    MaxDiskUsagePercent  int `json:"max_disk_usage_percent"`   // global safety ceiling, default 80
    DefaultQuotaMB       int `json:"default_quota_mb"`         // applied to new tenants, default 10240 (10 GB)
    DefaultMaxImageSizeMB int `json:"default_max_image_size_mb"` // per-file cap default, default 50
}
```

`backend/internal/models/user.go`:

```go
type User struct {
    ID           string `json:"id"`
    Email        string `json:"email"`
    Username     string `json:"username"`
    PasswordHash string `json:"password_hash"`
    Role         string `json:"role"`       // "platform_admin" | "tenant_admin"
    TenantID     string `json:"tenant_id"`  // "" for platform_admin
}
type UserStore struct { Users []User `json:"users"` }
```

`AdminConfig` ([admin_config.go](../../backend/internal/models/admin_config.go)) is
superseded by `users.json`; the migration (Phase 2) converts the existing admin into a
`platform_admin` user **and** a `tenant_admin` user for the `niels` tenant.

### 6.2 New services

- `PlatformStore` (`backend/internal/services/platform_store.go`): CRUD over
  `tenants.json`, `users.json`, and `platform_config.json` in `PRIVATE_DATA_DIR/platform/`,
  backed by the existing `FileService` (rooted at the platform dir). Provides:
  `GetTenantBySlug`, `ListTenants`, `CreateTenant`, `DeleteTenant`,
  `GetUserByLogin(tenantID, username)`, `CreateUser`, `GetPlatformConfig`,
  `SetTenantQuota`, etc.
- `Publisher` (`backend/internal/services/publisher.go`): implements the §3.1
  sanitization. `PublishAlbums(priv []Album) -> writes published albums.json`,
  `PublishSiteConfig(...)`. Pure transform + write via a `FileService` rooted at the
  tenant's published `data/` dir.
- `TenantServices` (`backend/internal/services/tenant_services.go`): a bundle holding the
  per-tenant `FileService` (private), `AlbumService`, `SiteConfigService`, `ImageService`
  (writing into the tenant's public `uploads/`), and `Publisher`. Construct lazily,
  **cache per slug** in a `sync.Map` keyed by slug.

### 6.3 Make existing services publish on write

`AlbumService` and `SiteConfigService` currently `WriteJSON` to one file. Change them so
that **after** a successful authoritative write they invoke the `Publisher` to regenerate
the tenant's published copy. Keep it synchronous and in-process. The cleanest seam:
inject a `Publisher` (or a callback) into these services and call it at the end of every
mutating method (`Create`, `Update`, `Delete`, `AddPhoto`, … in
[album_service.go](../../backend/internal/services/album_service.go);
`Update`, `SetMainPortfolioAlbum` in
[site_config_service.go](../../backend/internal/services/site_config_service.go)).

> Implementation tip for the agent: do NOT scatter publish calls across every method.
> Since every mutation already funnels through `AlbumService.Update`/`Create`/`Delete`
> (the photo methods call `Update` internally), add the publish call in those three
> funnels only. Verify by code-reading that `AddPhoto`, `DeletePhoto`, `ReorderPhotos`,
> `SetCoverPhoto`, etc. all end in `Update`.

### 6.4 Tenant resolution middleware

`backend/internal/middleware/tenant.go`:

- Read the host: prefer `X-Forwarded-Host`/`Host`. Strip port. Lowercase.
- Resolve in this order (all driven by env vars, no hardcoded strings):
  1. host == `PLATFORM_HOST` (e.g. `join.nielsshootsfilm.com`) → **platform** context
     (no tenant).
  2. host == `APEX_DOMAIN` or `www.<APEX_DOMAIN>` (e.g. `nielsshootsfilm.com`) → tenant
     context with slug = `APEX_TENANT_SLUG` (e.g. `niels`).
  3. otherwise → extract the leftmost label as the slug.
- Look the slug up in `PlatformStore`. If missing or `status != active` → 404 JSON for
  `/api/*`. Put the resolved `*Tenant` and its `*TenantServices` into the request context.
- Provide helpers `TenantFromCtx(ctx) (*Tenant, bool)` and `ServicesFromCtx(ctx) *TenantServices`.

Env vars introduced here: `APEX_DOMAIN` (base domain, e.g. `nielsshootsfilm.com`),
`PLATFORM_HOST` (e.g. `join.nielsshootsfilm.com`), `APEX_TENANT_SLUG` (e.g. `niels`).

### 6.5 Handlers pull services from context

Today handlers hold service pointers as struct fields
([album_handler.go](../../backend/internal/handlers/album_handler.go) etc.). Change them
to fetch per-request services:

```go
func (h *AlbumHandler) GetAll(w http.ResponseWriter, r *http.Request) {
    svc := middleware.ServicesFromCtx(r.Context())
    albums, err := svc.Album.GetAll()
    ...
}
```

This is mechanical but touches every handler method. Keep the `logger` on the handler
struct; move the service access to context. Do not change request/response shapes — the
frontend depends on them.

### 6.6 Auth refactor

Rework `AuthService` ([auth_service.go](../../backend/internal/services/auth_service.go)):

- Sessions gain `UserID`, `Role`, `TenantID` fields.
- `Authenticate` takes the **request's context** + credentials, looks the user up in
  `users.json` (the `platform_admin` user when on the platform host; the tenant's
  `tenant_admin` for a tenant host — including the apex, which is tenant `niels`), verifies
  bcrypt, and stores `TenantID`/`Role` on the session.
- `ValidateSession` additionally asserts the session's context matches the request's
  (platform session only valid on the platform host; tenant session's `TenantID` must match
  the resolved tenant). Cookies are host-scoped so this is belt-and-suspenders.
- The single in-memory `sessions` map is fine (one process). Sessions are lost on
  restart — acceptable; document it. Login again after deploy.

Cookie scoping (critical): keep the session cookie **host-only**. Do **not** set
`Domain=.nielsshootsfilm.com` (that would let one tenant's cookie hit another tenant).
Verify wherever the cookie is set in the auth handler.

### 6.7 Password-protected album access (challenge + verify)

Because protected albums are absent from every published file (§3.1), the SPA can't find
them in `albums.json`. So the load/share flow is: navigate to the slug → not in static
data → ask the backend. This needs **two public (no admin-auth), tenant-scoped** routes.
(The frontend already calls a `verify-password` endpoint that **does not exist in the
backend** — [api.ts:85](../../frontend/src/utils/api.ts#L85), confirmed absent from
[main.go](../../backend/cmd/admin/main.go) — so this is net-new backend work.)

The flow when a visitor opens `…/albums/{slug}`:

1. SPA loads the public `albums.json` and looks up `{slug}`. If found (public/unlisted) →
   render as today. **Done — no backend needed.**
2. If **not** found, SPA calls `GET /api/albums/{slug}/challenge`:
   - No such album in the authoritative store → `404` → SPA shows "album not found".
   - Album exists and is `password_protected` → return a **minimal challenge** only:
     `{ id, slug, title, protected: true }`. **No photos, no other data.** SPA shows the
     password gate.
3. Visitor enters the password → SPA calls `POST /api/albums/{slug}/verify-password`
   with `{ password }`:
   - Backend compares bcrypt against the `password_hash` in the **authoritative (private)**
     store.
   - On success → return the **full album object** + a short-lived token; SPA renders it.
   - On failure → `401`.

Notes:

- Both routes resolve the tenant from Host like everything else; they read only the private
  store (never published files).
- Rate-limit `verify-password` (basic; see Phase 7).
- The frontend's password flow ([password-form.ts](../../frontend/src/pages/password-form.ts))
  and [api.ts](../../frontend/src/utils/api.ts) must be updated to: hit `/challenge` when an
  album isn't in static data, and render the album returned by `verify-password` instead of
  reading it from `albums.json` (Phase 6). Keep using slug (the SPA route param), not id.
- This is exactly where image-byte gating slots in later (Phase 7): the same token returned
  here would authorize a Go-proxied image route. Not built now, but the shape is ready.

### 6.8 main.go wiring

`main.go` changes substantially:

- Replace `DATA_DIR`/`UPLOAD_DIR` env with `PRIVATE_DATA_DIR`, `SITES_DIR`, `APEX_DOMAIN`,
  `PLATFORM_HOST`, `APEX_TENANT_SLUG` (keep backward-compatible defaults for local dev).
  Remove the static `/uploads/*` file server (nginx serves uploads now).
- Build `PlatformStore` and a `TenantServices` cache/factory.
- Add `middleware.Tenant(...)` to the router before route groups.
- Add platform-admin routes (see §6.9), gated to `role == platform_admin`.
- Keep CORS but allow the dev subdomains (e.g. `*.localhost`) — see §9 dev notes.

### 6.9 Platform-admin API (platform host only, platform_admin role)

New `PlatformHandler` — these routes are only valid when the request resolves to the
**platform** context (the `PLATFORM_HOST`, i.e. `join.nielsshootsfilm.com`):

- `POST /api/admin/login` authenticates the platform admin.
- `GET  /api/admin/tenants` — list tenants.
- `POST /api/admin/tenants` — create tenant: validate slug, create both directories,
  scaffold default `site_config.json` (reuse `SiteConfigService.getDefaultConfig`) and
  empty `albums.json`, create the `tenant_admin` user with a provided/initial password,
  set `quota_mb` from the request or fall back to `PlatformConfig.DefaultQuotaMB`
  (**10 GB = 10240 MB**), publish initial empty public data. Idempotent-ish: fail clearly
  if slug exists.
- `DELETE /api/admin/tenants/{slug}` — soft delete (set `status=suspended`) by default;
  hard delete (remove directories) behind an explicit `?purge=true` + confirmation.
- `POST /api/admin/tenants/{slug}/reset-password` — set a new password for that tenant's
  admin user (operator-driven reset; see §6.10).
- `PUT  /api/admin/tenants/{slug}/quota` — set that tenant's `quota_mb` (§14).
- `GET  /api/admin/platform/storage` — machine-global storage view: whole-disk `Statfs`,
  the global ceiling, and a per-tenant usage/quota table (§14).
- `GET/PUT /api/admin/platform/config` — read/update `platform_config.json`
  (`max_disk_usage_percent`, `default_quota_mb`, `default_max_image_size_mb`).

Reuse the existing role-gating middleware pattern; add a `RequireRole("platform_admin")`
middleware.

### 6.10 Password management

Mostly reuse — little new logic:

- **Tenant admin changes own password (already ~built).** `AuthService.ChangePassword`
  (old→new, re-hash, persist) exists
  ([auth_service.go:142](../../backend/internal/services/auth_service.go#L142)), the
  endpoint exists, and the frontend already calls it
  ([admin-api.ts:633](../../frontend/src/utils/admin-api.ts#L633)). **Only change:** persist
  to the user's record in `users.json` instead of `admin_config.json`.
- **Initial password** is set by the platform admin at tenant creation (§6.9 `POST
/tenants`). The `hash-password` CLI ([backend/cmd/hash-password](../../backend/cmd/hash-password))
  stays useful for manual seeding/migration.
- **Forgot password → operator reset (new, small).** No email/SMTP, no self-service reset
  flow (out of scope at this scale). Instead the platform admin sets a new password via
  §6.9 `reset-password`. One endpoint + a button on the platform-admin page.

## 7. Frontend refactor

The compiled SPA is **one shared bundle** that runs on the platform host and every tenant
(including the apex). It chooses behavior from `window.location.hostname`.

### 7.1 Host-context detection

Add `frontend/src/utils/site-context.ts`:

- `getSiteContext(): { kind: 'platform' } | { kind: 'tenant'; slug: string }`.
- `platform` if hostname == the platform host (`join.<apex>`).
- otherwise `tenant`: the bare apex (and `www`) → slug = the apex tenant (`niels`); any
  other subdomain → slug = the leftmost label.
- In dev, treat `localhost`/`127.0.0.1` as a configurable context (env or query param;
  see §9).

### 7.2 Routing changes

In [app-shell.ts](../../frontend/src/components/app-shell.ts) the route table is built once
(lines ~127-145). Split it by context:

- **platform context** (`join.`) routes:
  - `/` → `landing-page` (NEW)
  - `/admin/login` → `platform-login-page` (can reuse `admin-login-page`)
  - `/admin` → `platform-admin-page` (NEW: list/create/delete tenants), guarded
- **tenant context** routes (apex and all other subdomains): the existing public + admin
  routes, unchanged.

### 7.3 New pages

- `landing-page.ts`: static marketing/explainer content. Pure client-side, lives in the
  shared shell, needs no backend. Explains the platform, links to the operator, etc.
- `platform-admin-page.ts`: table of tenants + "Create tenant" form (slug, display name,
  owner email, initial password) calling the §6.9 API. Only reachable after platform login.

### 7.4 Existing admin/public pages: minimal change

Because `admin-api.ts` and `api.ts` use **relative** URLs
([admin-api.ts:11](../../frontend/src/utils/admin-api.ts#L11)), when the SPA is served
from `alice.nielsshootsfilm.com`, all `/api/*`, `/data/*`, `/uploads/*` requests
automatically target Alice's subdomain → backend resolves the tenant from Host, nginx
serves Alice's files. **No per-call tenant param is needed.** This is the big win — the
existing tenant admin UI mostly "just works" once context routing is in place.

The one required change: the **password-album flow** must call the new `verify-password`
endpoint and render the returned album (see §6.7), instead of finding the album in the now
sanitized static data.

### 7.5 Build & deploy changes

- `build.sh` keeps producing the single shell. Deploy it to `APP_DIR` (`/srv/app`) once
  per release (update [scripts/deploy-frontend.sh](../../scripts/deploy-frontend.sh) target).
- Per-tenant `data/` and `uploads/` are written by the backend at runtime — they are **not**
  part of the frontend deploy.

## 8. Migration of the existing site

Write `scripts/migrate-to-multitenant.sh` (and/or a one-shot Go command under
`backend/cmd/`):

1. The existing portfolio becomes the `niels` tenant, **still served at the bare apex**
   `nielsshootsfilm.com` (no URL change, no redirects needed). The platform lives at the
   separate `join.nielsshootsfilm.com` host.
2. Create `PRIVATE_DATA_DIR/platform/{tenants.json,users.json}` and register tenant
   `niels` with `slug=niels`.
3. Create tenant `niels`: move current `data/*.json` → `PRIVATE_DATA_DIR/tenants/niels/`,
   move current `uploads/*` → `SITES_DIR/tenants/niels/uploads/`.
4. Convert `admin_config.json` → one `platform_admin` user + one `tenant_admin` user for
   `niels` (same password hash to start).
5. Run the publisher once to generate `SITES_DIR/tenants/niels/data/*.json` (sanitized).
6. Set env: `APEX_DOMAIN=nielsshootsfilm.com`, `PLATFORM_HOST=join.nielsshootsfilm.com`,
   `APEX_TENANT_SLUG=niels`.

Keep the script idempotent and non-destructive (copy, verify, then remove originals only
after success). Back up everything first.

## 9. Local development

- Subdomains on localhost: use `*.localhost` (resolves to 127.0.0.1 in modern browsers/curl)
  → `alice.localhost:5173`, `join.localhost:5173` (platform), or add `/etc/hosts` entries.
  Set `APEX_DOMAIN=localhost`, `PLATFORM_HOST=join.localhost`, `APEX_TENANT_SLUG=niels`
  (so bare `localhost` serves the `niels` tenant, matching prod).
- `vite.config.ts` may need `server.host` and an allowed-hosts entry for `*.localhost`.
- Backend CORS: allow the dev origins including subdomains.
- Provide a `dev` seed script that creates two tenants (`niels`, `alice`) so isolation is
  testable locally.

## 10. Phased delivery (implement in order; each phase is shippable & verifiable)

> Each phase ends with: `./test.sh` green, plus the explicit manual check listed.
> Commit at the end of each phase. Do not start a phase before the previous one verifies.

### Phase 0 — Scaffolding & config (no behavior change)

- Add new env vars (`PRIVATE_DATA_DIR`, `SITES_DIR`, `APEX_DOMAIN`, `PLATFORM_HOST`,
  `APEX_TENANT_SLUG`) with defaults that reproduce today's single-site behavior. Update
  `env.example`, `bootstrap.sh`.
- Add empty model/service files (compile, no wiring).
- **Verify:** app builds and runs exactly as before.

### Phase 1 — Private/public split for the single existing site

- Implement `Publisher` + §3.1 sanitization. Point the backend's authoritative store at a
  private dir and publish into the served `data/` dir. Wire publish-on-write into
  `AlbumService`/`SiteConfigService`.
- Implement the §6.7 `challenge` + `verify-password` endpoints (so protected albums still
  work once they're omitted from published data).
- **Verify:** edit an album in admin → published `albums.json` updates, contains **no**
  `password_hash`, and password-protected albums are **absent** from it (slug not present);
  `GET /api/albums/{slug}/challenge` returns a challenge and `verify-password` returns the
  full album. Public site still renders. Backend stop → public (non-protected) site still
  loads.

### Phase 2 — Tenant + user models, registry, migration

- Add `Tenant`/`User` models, `PlatformStore`, platform files. Run the migration to make
  the existing site the `niels` tenant. Still effectively one tenant.
- **Verify:** `tenants.json`/`users.json` exist and are well-formed; site loads from the
  `niels` directories.

### Phase 3 — Tenant resolution + per-tenant services

- Add tenant middleware + `TenantServices` cache; convert handlers to pull services from
  context. Create a second local tenant `alice`.
- **Verify:** `niels.localhost` and `alice.localhost` show **isolated** data; editing one
  never affects the other; unknown subdomain → 404.

### Phase 4 — Multi-user auth

- Tenant-scoped login, `platform_admin`/`tenant_admin` roles, session tenant binding,
  host-only cookies, `RequireRole`. Retarget `ChangePassword` to `users.json` and add the
  operator `reset-password` endpoint (§6.10).
- **Verify:** tenant_admin can only edit their tenant; platform login works on the `join.`
  host (and is rejected on tenant hosts); a tenant cookie cannot act on another tenant; a
  tenant admin can change their own password and the platform admin can reset it.

### Phase 5 — nginx wildcard + provisioning

- Wildcard cert; the three server blocks from §5 (wildcard tenants, apex→`niels`,
  `join.` platform); deploy shell to `APP_DIR`.
- Implement `create-tenant` (API §6.9 and/or a script) that scaffolds dirs + user +
  initial publish.
- **Verify:** create a brand-new tenant end-to-end with zero nginx/DNS edits; it serves.

### Phase 6 — Frontend: landing, platform admin, password flow

- `site-context.ts`, split routing, `landing-page`, `platform-admin-page` (incl. the
  reset-password button), and the §6.7 `challenge`→`verify-password` password album flow.
- **Verify:** `join.` shows landing + platform admin (create a tenant from the UI); the
  apex and other subdomains show portfolios; opening a protected album's slug shows the gate
  via `/challenge` and unlocks via `verify-password`.

### Phase 7 — Hardening (optional, can trail)

- **Storage & quotas (§14):** per-tenant quota view + the two upload gates (tenant quota,
  platform safety) + the platform-wide storage view. Replaces today's single-user
  whole-disk view.
- Gate **password-protected image bytes** through Go (token-checked image proxy) so photo
  files aren't reachable by raw URL.
- Basic **rate limiting** on login + verify-password.
- Per-tenant **export** script (`export-tenant <slug> <outdir>`) — trivial here because the
  published dir is already a static site; assemble shell + that tenant's `data/`+`uploads/`.
- Tests for sanitization, tenant isolation, auth scoping.

## 11. Open decisions (resolve before Phase 2; defaults chosen)

1. **Apex vs operator's live site.** ✅ RESOLVED: the apex `nielsshootsfilm.com` stays
   Niels's portfolio (served as the reserved tenant `niels`); the platform lives at the
   separate host `join.nielsshootsfilm.com`. No live URLs move, no redirects needed. The
   apex block is just a tenant block hard-wired to the `niels` directory (§5b).
2. **Self-serve signup vs operator-provisioned.** Default (matches the brief): only the
   platform admin creates tenants. No public signup. Keep it that way for "dozens" scale.
3. **One `users.json` vs per-tenant user files.** Default: one `users.json` in the
   platform store (simpler at this scale).

## 12. Schema changes & migrations

There is no database; the "schema" is the Go structs and the data is JSON files. Two cases:

- **Additive changes — the default, no migration needed.** Go's JSON unmarshal ignores
  unknown fields and zero-fills missing ones, so adding `Album.NewField` makes old files
  read back as the zero value. **Rule of thumb: prefer adding new optional fields, and make
  both the Go code and the frontend tolerate a missing/zero value with a sensible default.**
  This should cover the large majority of changes.
- **Breaking changes — rare, need a migration.** Renaming, removing, or restructuring a
  field, or needing a non-zero backfill.

When a migration is genuinely required, add a lightweight runner (it must sweep **every
tenant's** private files and then re-publish):

- Give each data file a `schema_version` int (formalize the existing informal versions:
  `albums.json` already carries `"version"`, and `SiteConfig.Version` exists).
- Add a `backend/cmd/migrate` CLI with an **ordered list of Go migration funcs**
  (`v1→v2→v3`). It iterates all tenants, applies any whose `schema_version` is behind,
  writes back via `FileService` (which auto-backs-up — §13), bumps the version, then
  re-publishes that tenant.
- Run it **explicitly on deploy**, not magic-on-write, so migrations are reviewable. Make
  funcs idempotent where practical.

## 13. Backups & recovery

The private/public split shrinks what must be protected: **published files are regenerable**
(re-run the publisher from the authoritative copy), so the only irreplaceable data is the
authoritative JSON in `PRIVATE_DATA_DIR` (small) and the uploaded image bytes in
`SITES_DIR/.../uploads/` (large). Back the JSON tree up often and cheaply; back the uploads
up less frequently.

- **Routine per-write safety already exists.** Every `FileService.WriteJSON` writes a
  timestamped `.bak` and keeps the last 10, with `Rollback()` to restore the newest
  ([file_service.go:117-223](../../backend/internal/services/file_service.go#L117)). With
  per-tenant dirs, each tenant gets its own `.backups/`.
- **Before any migration, take a full snapshot** of `PRIVATE_DATA_DIR` (a timestamped tar —
  cheap, it's all JSON), run the migration, verify, and restore the snapshot on failure.
  The rolling 10-backup is not enough if a migration rewrites a file many times.
- Provide a `scripts/backup.sh` that tars `PRIVATE_DATA_DIR` (and, on its own cadence, the
  uploads tree) with a timestamp; keep an offsite copy.

## 14. Storage & quotas

Today's storage feature ([storage_handler.go](../../backend/internal/handlers/storage_handler.go))
is a single-user view that conflates two unrelated things: a `syscall.Statfs` view of the
**whole machine's disk** and a `MaxDiskUsagePercent` ceiling that lives in the per-tenant
`site_config.json`. Multi-tenant splits these into two distinct concerns.

### 14.1 Two concerns

**(A) Per-tenant quota — tenant-facing.** What a tenant admin sees and is limited by.

- Each tenant has `quota_mb` (on the `Tenant` model). **Default 10 GB (10240 MB)** on
  create; `0` means unlimited.
- A tenant's usage = walk of **their own** `SITES_DIR/tenants/<slug>/uploads/`
  (`originals`/`display`/`thumbnails`) — reuse `calculateDirectorySize` /
  `calculateStorageBreakdown`, just rooted at the tenant dir.
- Tenant admin page shows `used / quota_mb`, percent, and warning bands (e.g. warn at
  90%). It must **not** show whole-disk numbers or any other tenant's data.

**(B) Platform disk health — operator-facing.** Lives on the `join.` platform admin page.

- Whole-disk `Statfs` (total / free / overall %), the global `max_disk_usage_percent`
  ceiling, a **per-tenant table** (usage, quota, % of quota), and **sum-of-quotas vs
  physical disk** so oversubscription is visible.
- Oversubscription is allowed and expected (quotas may sum to more than the disk); the
  view exists precisely to keep an eye on it.

### 14.2 Where each setting lives

- **`quota_mb`** — didn't exist before → now **per-tenant** (`Tenant` model), default 10 GB.
- **`max_disk_usage_percent`** — was per-tenant `site_config` → now **platform-global**
  (`platform_config.json`).
- **`max_image_size_mb`** — was per-tenant `site_config` → now a **platform default**
  (`platform_config.json`) **plus an optional per-tenant override**.

Model change: in `SiteConfig.StorageConfig`
([site_config.go](../../backend/internal/models/site_config.go)), `MaxImageSizeMB` becomes
an **override** (`0` = inherit the platform default) and `MaxDiskUsagePercent` becomes
**deprecated/ignored** (the platform value is authoritative). To avoid a migration, leave
the old field present but stop reading it (additive philosophy, §12).

### 14.3 Enforcement — two upload gates (new)

Today the limit is **advisory only** (warning text; the upload path doesn't block — see
[album_handler.go UploadPhotos](../../backend/internal/handlers/album_handler.go#L142),
which only checks per-file size). Add **hard** gates in `UploadPhotos`, checked before
processing each file:

1. **Tenant quota gate:** if `tenant_used + incoming_size > quota_mb` (and `quota_mb != 0`)
   → reject with `413` and a clear "storage quota exceeded" message.
2. **Platform safety gate:** if whole-disk usage `>= max_disk_usage_percent` → reject **all**
   uploads with `507` "platform storage full — contact the operator". Protects the machine
   even when quotas are oversubscribed.
3. Per-file size cap = tenant `max_image_size_mb` override, else platform default.

### 14.4 Computing usage

- Start with **on-demand directory walks** (fine at dozens of tenants). The per-tenant view
  walks one dir; the platform view walks N.
- If the platform view gets slow, add a **cached `used_bytes` per tenant** (in the registry),
  incremented on upload / decremented on delete, with a periodic full-walk reconcile to
  correct drift. Optimization only — don't build it preemptively.
- These are **app-level logical quotas**, not OS filesystem quotas: simpler and
  cross-platform, good enough for photos (not a hard kernel guarantee).

### 14.5 Endpoints & frontend

- **Tenant** (`GET /api/admin/storage/stats`, tenant host): refactor the existing handler
  to be tenant-scoped — walk the tenant's uploads, compare to `quota_mb`. Drop whole-disk
  fields from this response.
- **Platform** (`GET /api/admin/platform/storage`, §6.9): whole-disk + per-tenant table.
- **Frontend:** split [storage-stats.ts](../../frontend/src/components/storage-stats.ts) —
  a per-tenant quota view on the tenant admin page, and a disk-health + per-tenant table on
  the platform admin page.

## 15. Guardrails / DO-NOT list for the implementer

- **DO NOT** serve `/data` or `/uploads` from Go in production — nginx serves them. Go only
  writes them.
- **DO NOT** put `password_hash`, users, or the tenant registry into any published/served
  directory. Re-read §3.1 before writing the publisher.
- **DO NOT** set a wildcard cookie `Domain`. Cookies must be host-only.
- **DO NOT** change existing API request/response JSON shapes — the frontend depends on them.
- **DO NOT** collapse the private/published split "to save time." It is the security model
  and the export model.
- **PREFER** adding the publish call only in the `AlbumService` write funnels, not in every
  photo method.
- **PREFER** additive, optional fields with safe defaults over migrations (§12); only write
  a migration when a field must change shape or be backfilled.
- **DO** snapshot `PRIVATE_DATA_DIR` before running any migration (§13).
- When unsure about a behavior, **read the referenced file** rather than guessing; this
  plan links the exact sources.
