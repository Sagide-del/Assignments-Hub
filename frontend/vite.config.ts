import { routeRequest } from "./scripts/generate-routing.mjs";
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Vite's SPA fallback does not resolve directory indexes from public/ in dev.
// Serve the same standalone revision documents in dev and production preview.
function revisionDirectoryIndex(root: string) {
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const [path, query] = (request.url ?? '').split('?');
    if (!/^\/(?:revision(?:\/[a-z0-9-]+){0,2}|free-revision|blog(?:\/[a-z0-9-]+)?)\/?$/.test(path)) return next();
    const directory = path.endsWith('/') ? path : `${path}/`;
    if (!existsSync(resolve(root, `.${directory}index.html`))) return next();
    if (!path.endsWith('/')) {
      response.writeHead(301, { Location: directory + (query ? `?${query}` : '') });
      response.end();
      return;
    }
    request.url = `${directory}index.html${query ? `?${query}` : ''}`;
    next();
  };
}

// Preview the exact production route contract, including real HTTP 404s.
function staticRouting(root: string) {
  const manifest = resolve(root, "routing-manifest.json");
  if (!existsSync(manifest)) throw new Error("Build the static route manifest before previewing.");
  const routes = JSON.parse(readFileSync(manifest, "utf8"));
  return (request: IncomingMessage, response: ServerResponse, next: () => void) => {
    const [uri, query] = (request.url ?? "/").split("?");
    const result = routeRequest({ uri }, routes);
    if (uri === "/sitemap.xml") response.setHeader("Cache-Control", "public,max-age=86400");
    if (result.statusCode || !result.uri || !existsSync(resolve(root, `.${result.uri}`))) {
      response.writeHead(404, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" });
      response.end(routes.notFound);
      return;
    }
    request.url = result.uri + (query ? `?${query}` : "");
    next();
  };
}

// Dev-server proxy so the frontend can call same-origin `/api/v1/...` paths
// during local development without CORS headaches. In production the app is
// built as static assets and either served by the NestJS backend itself
// (see backend/src/main.ts's static-file fallback) or deployed separately on
// Render behind its own domain, in which case VITE_API_URL (see
// src/api/axios.ts) points at the real API host instead.
export default defineConfig({
  plugins: [react(), {
    name: 'public-revision-directory-index',
    configureServer(server) {
      server.middlewares.use(revisionDirectoryIndex(server.config.publicDir));
    },
    configurePreviewServer(server) {
      server.middlewares.use(staticRouting(resolve(server.config.root, server.config.build.outDir)));
    },
  }],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
