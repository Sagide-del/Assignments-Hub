import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev-server proxy so the frontend can call same-origin `/api/v1/...` paths
// during local development without CORS headaches. In production the app is
// built as static assets and either served by the NestJS backend itself
// (see backend/src/main.ts's static-file fallback) or deployed separately on
// Render behind its own domain, in which case VITE_API_URL (see
// src/api/axios.ts) points at the real API host instead.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api/v1': {
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
