# Deployment Guide

## Overview

This project consists of two parts:

- **Frontend**: Static website (HTML/CSS/JS)
- **Backend**: Go server for admin operations

## Admin Password Configuration

### Local Development

For local testing with a simple password:

1. Copy `env.example` to `env` (if not already done)
2. Set `ADMIN_PASSWORD=admin` in `env`
3. The backend will automatically hash this password when it starts
4. `env` is in `.gitignore` and won't be deployed

### Production Deployment

For production with a secure password:

1. Generate a secure password hash:

   ```bash
   cd backend
   go run cmd/hash-password/main.go YOUR_SECURE_PASSWORD
   ```

2. **Option A**: Set in environment variable (recommended for Docker/cloud):

   ```bash
   export ADMIN_PASSWORD_HASH='$2a$10$...'
   ```

3. **Option B**: Set in `data/admin_config.json`:

   ```json
   {
     "username": "admin",
     "password_hash": "$2a$10$..."
   }
   ```

4. **Important**: Do NOT set `ADMIN_PASSWORD` in production - only use `ADMIN_PASSWORD_HASH`

**Priority order**: `ADMIN_PASSWORD` (dev) > `ADMIN_PASSWORD_HASH` (env) > `admin_config.json`

---

## Frontend Deployment

The frontend is built as a static website that can be hosted on any static web server (nginx, Apache, Netlify, Vercel, S3+CloudFront, etc.). The build process compiles TypeScript to JavaScript, bundles assets, and copies necessary data files.

## Building for Production

### Quick Build

From the project root:

```bash
cd frontend
./scripts/build.sh
```

This will:

1. Compile TypeScript and bundle JavaScript/CSS
2. Create a `frontend/build/` directory
3. Copy `data/` directory (JSON configuration files)
4. Copy `uploads/` directory (uploaded images from `static/uploads/`)

### Build Output Structure

```text
frontend/build/
├── index.html          # Main HTML file
├── assets/             # Compiled JS and CSS
│   ├── main-[hash].js
│   └── main-[hash].css
├── data/               # JSON data files
│   ├── site_config.json
│   ├── albums.json
│   └── blog_posts.json
└── uploads/            # User-uploaded images
    ├── originals/      # Original uploaded files
    ├── display/        # Resized for display (~1200px wide)
    └── thumbnails/     # Small thumbnails (~400px wide)
```

## Deployment

### Requirements

- Static web server capable of serving files from root
- All files in `build/` directory must be served from domain root
- Example: `nielsshootsfilm.com/index.html`, not `nielsshootsfilm.com/frontend/index.html`
- **SPA Fallback Required**: Server must serve `index.html` for all non-file routes

### Path Structure

The application expects these paths from domain root:

- `/` - index.html
- `/assets/*` - JavaScript and CSS bundles
- `/data/*.json` - Configuration and album data
- `/uploads/**/*` - Image files

### Deployment Steps

1. **Build the frontend:**

   ```bash
   cd frontend
   ./scripts/build.sh
   ```

2. **Copy to web server:**
   Copy the entire contents of `frontend/build/` to your web server's root directory.

   Example with rsync:

   ```bash
   rsync -avz --delete frontend/build/ user@server:/var/www/html/
   ```

   Example with AWS S3:

   ```bash
   aws s3 sync frontend/build/ s3://your-bucket-name/ --delete
   ```

3. **Verify paths:**
   - Open `https://yourdomain.com/` - should load the site
   - Check browser console for any 404 errors
   - Verify images load correctly

### Server Configuration

#### Nginx

```nginx
# nielsshootsfilm.com - HTTP redirect
server {
    listen 80;
    listen [::]:80;
    server_name nielsshootsfilm.com www.nielsshootsfilm.com;

    # Let's Encrypt ACME challenge
    location /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
    }

    # Redirect to HTTPS
    location / {
        return 301 https://$host$request_uri;
    }
}

# nielsshootsfilm.com - HTTPS
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    http2 on;
    # server_name: Use regex ~^.+\.nielsshootsfilm.com$ to match all subdomains with wildcard cert
    server_name nielsshootsfilm.com www.nielsshootsfilm.com;

    # SSL certificate
    ssl_certificate /etc/letsencrypt/live/nielsshootsfilm.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nielsshootsfilm.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Health check endpoint - must come BEFORE SPA routing
    location /.well-known/health {
        access_log off;  # Don't clutter logs with monitoring pings
        add_header Content-Type text/plain;
        return 200 'OK';
    }

    # API reverse proxy - must come BEFORE SPA routing
    location ^~ /api {
        proxy_pass http://localhost:6180;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Timeouts for image uploads
        proxy_connect_timeout 60s;
        proxy_send_timeout 600s;
        proxy_read_timeout 600s;

        # Buffer settings for large uploads
        client_max_body_size 110M;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    # Site root
    root /Users/njoubert/webserver/sites/nielsshootsfilm.com/public;
    index index.html index.htm;

    # Don't cache data files - they may be updated by admin
    location /data/ {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }

    # SPA routing - serve index.html for all non-file requests
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}

```

## Testing the Build Locally

Test the production build locally before deploying:

```bash
cd frontend/build
python3 -m httpserver 6180
```

Then open `http://localhost:6180` in your browser.

**Important**: Simple Python HTTP server does NOT support SPA fallback. While client-side navigation works fine, you'll see 404 errors when:

- Directly visiting routes like `http://localhost:6180/albums`
- Refreshing the page on any route other than the homepage

This happens because the server tries to find a physical file at `/albums` instead of serving `index.html`. Your SPA routing works correctly - it just needs the server to return `index.html` for all routes so the JavaScript can initialize and handle the routing.

To test with proper SPA fallback locally:

- Use `vite preview` from the frontend directory (after building)
- Install a simple SPA server: `npx serve -s build`
- Use nginx or Apache locally with SPA fallback configured

## Important Notes

### Admin Backend NOT Included

This deployment guide covers **ONLY the public-facing frontend**. The admin interface and Go backend are not included in this build and should be deployed separately if needed.

### Data Updates

- The `data/` directory contains JSON files that define site configuration and albums
- These files are static in the build
- To update content, you'll need to either:
  1. Deploy the admin backend to modify these files remotely, or
  2. Rebuild and redeploy the frontend with updated JSON files

### Image Management

- Images in `static/uploads/` are copied as-is from your development environment
- Ensure you have all required images before building
- Large image directories will increase build time and deployment size

### Production Checklist

- [ ] Run `./scripts/build.sh` to create production build
- [ ] Verify `frontend/build/` directory contains all expected files
- [ ] Test locally with a simple HTTP server
- [ ] Deploy to web server root (not a subdirectory)
- [ ] Verify site loads correctly at your domain
- [ ] Check browser console for any 404 errors
- [ ] Verify images load correctly
- [ ] Test navigation between pages
- [ ] Test on mobile devices
