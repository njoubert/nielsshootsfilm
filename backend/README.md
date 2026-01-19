# Backend - Admin Server

Photography portfolio admin backend built with Go.

## Quick Start

### 1. Generate Admin Password Hash

```bash
go run ./cmd/hash-password/main.go "your-secure-password"
```

Copy the generated hash.

### 2. Set Environment Variables

Create a `env` file in the project root (copy from `env.example`):

```bash
cd /path/to/nielsshootsfilm
cp env.example env
```

**Note:** There's a symlink at `backend/env` that points to the root `env` file, so you only need to maintain one `env` file at the project root.

Edit `env` and set your password hash:

```env
ADMIN_USERNAME=admin
ADMIN_PASSWORD_HASH=<paste-hash-here>
DATA_DIR=../data
UPLOAD_DIR=../static/uploads
PORT=6180
```

### 3. Run the Server

```bash
# Load environment variables
export $(cat env | xargs)

# Run the server
go run ./cmd/admin/main.go
```

Or build and run:

```bash
go build -o bin/admin ./cmd/admin
./bin/admin
```

The server will start on `http://localhost:6180`.

## API Endpoints

### Public Endpoints

- `GET /healthz` - Health check
- `GET /api/albums` - List all albums
- `GET /api/albums/{id}` - Get album by ID
- `GET /api/config` - Get site configuration

### Admin Endpoints (Require Authentication)

**Authentication:**

- `POST /api/admin/login` - Login (get session cookie)
- `POST /api/admin/logout` - Logout
- `POST /api/admin/change-password` - Change admin password

**Album Management:**

- `POST /api/admin/albums` - Create album
- `PUT /api/admin/albums/{id}` - Update album
- `DELETE /api/admin/albums/{id}` - Delete album
- `POST /api/admin/albums/{id}/photos/upload` - Upload photos (multipart/form-data)
- `DELETE /api/admin/albums/{id}/photos/{photoId}` - Delete photo
- `POST /api/admin/albums/{id}/set-cover` - Set cover photo
- `POST /api/admin/albums/{id}/set-password` - Set album password
- `DELETE /api/admin/albums/{id}/password` - Remove password protection

**Site Configuration:**

- `PUT /api/admin/config` - Update site config
- `PUT /api/admin/config/main-portfolio-album` - Set main portfolio album

### Static Files

- `/uploads/*` - Uploaded photos (originals, display, thumbnails)

## Architecture

### Services

- **FileService**: Atomic JSON file operations with backups and rollback
- **AlbumService**: Album CRUD operations
- **SiteConfigService**: Site configuration management
- **AuthService**: Session-based authentication
- **ImageService**: Image upload, processing (resize, WebP conversion), EXIF extraction

### Middleware

- **RequestID**: Unique request ID for tracing
- **Logger**: Structured logging with slog
- **Recoverer**: Panic recovery
- **SecurityHeaders**: Security HTTP headers
- **Auth**: Session validation for protected routes

### Handlers

- **AlbumHandler**: Album and photo management endpoints
- **AuthHandler**: Authentication endpoints
- **ConfigHandler**: Site configuration endpoints

## Development

### Build

```bash
go build -o bin/admin ./cmd/admin
```

### Test

```bash
go test ./...
```

### Format

```bash
go fmt ./...
```

### Dependencies

```bash
go mod tidy
```

## Environment Variables

| Variable              | Description                   | Default             |
| --------------------- | ----------------------------- | ------------------- |
| `ADMIN_USERNAME`      | Admin username                | `admin`             |
| `ADMIN_PASSWORD_HASH` | Bcrypt hash of admin password | (required)          |
| `DATA_DIR`            | Directory for JSON data files | `../data`           |
| `UPLOAD_DIR`          | Directory for uploaded images | `../static/uploads` |
| `PORT`                | Server port                   | `6180`              |

## File Structure

```text
backend/
├── cmd/
│   ├── admin/          # Main admin server
│   └── hash-password/  # Password hash utility
├── internal/
│   ├── handlers/       # HTTP request handlers
│   ├── middleware/     # HTTP middleware
│   ├── models/         # Data models
│   └── services/       # Business logic services
├── vendor/             # Vendored Go dependencies (hermetic builds)
├── scripts/            # Build, test, and maintenance scripts
├── go.mod              # Go module dependencies
└── env.example         # Environment variable template
```

## Dependencies & Vendoring

**All Go dependencies are vendored** in `vendor/` for hermetic builds (no network required).

**Adding a new package:**

```bash
cd backend
go get <package>@<version>   # Add dependency
go mod tidy                   # Clean up go.mod
go mod vendor                 # Regenerate vendor directory
git add vendor go.mod go.sum  # Commit together
```

**Updating dependencies:**

```bash
./scripts/update-deps.sh           # Check for updates
./scripts/update-deps.sh --update  # Interactive update
```

**Important:** All project scripts already use `-mod=vendor`. If running `go` commands directly, add the flag: `go build -mod=vendor ./...`

## Security Features

- Bcrypt password hashing
- Session-based authentication with HTTP-only cookies
- CORS configuration for frontend
- Security headers (X-Frame-Options, CSP, etc.)
- Request ID tracking
- Panic recovery
- File upload validation (size, type, path traversal protection)
- Atomic file writes with backups

## Image Processing

Uploaded images are processed into three versions:

1. **Original** (`/uploads/originals/`) - Untouched original file
2. **Display** (`/uploads/display/`) - 3840px WebP at 85% quality (4K optimized)
3. **Thumbnail** (`/uploads/thumbnails/`) - 800px WebP at 80% quality

EXIF data is extracted and stored in the photo metadata.
