import fs from 'fs';
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  root: 'src',
  publicDir: resolve(__dirname, '../data'),
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'assets',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    open: true,
    proxy: {
      '/api': {
        target: 'http://localhost:6180',
        changeOrigin: true,
      },
    },
    fs: {
      // Allow serving files from parent directory (for /data)
      allow: ['..', '../..'],
    },
  },
  plugins: [
    {
      name: 'serve-static-uploads',
      configureServer(server) {
        // Serve data files with no-cache headers
        server.middlewares.use('/data', (req, res, next) => {
          if (!req.url) {
            next();
            return;
          }

          // Strip query parameters (e.g., ?_=timestamp for cache busting)
          const urlPath = req.url.split('?')[0];

          const dataPath = resolve(__dirname, '../data');
          const filePath = resolve(dataPath, urlPath.substring(1));

          // Security check: ensure path is within data directory
          if (!filePath.startsWith(dataPath)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const stat = fs.statSync(filePath);
            // Don't cache data files - they may be updated by admin
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Length', stat.size.toString());
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });

        server.middlewares.use('/uploads', (req, res, next) => {
          if (!req.url) {
            next();
            return;
          }

          // Strip query parameters (e.g., ?_=timestamp for cache busting)
          const urlPath = req.url.split('?')[0];

          const staticPath = resolve(__dirname, '../static/uploads');
          const filePath = resolve(staticPath, urlPath.substring(1));

          // Security check: ensure path is within static/uploads
          if (!filePath.startsWith(staticPath)) {
            res.statusCode = 403;
            res.end('Forbidden');
            return;
          }

          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            const stat = fs.statSync(filePath);
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Content-Length', stat.size.toString());
            fs.createReadStream(filePath).pipe(res);
          } else {
            next();
          }
        });
      },
    },
  ],
});
