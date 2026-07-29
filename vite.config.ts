import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project under /<repo-name>/, so assets must be
  // requested from that sub-path. Locally (dev) base stays "/".
  base: process.env.NODE_ENV === 'production' ? '/iica-admin-panel/' : '/',
  plugins: [react()],
  server: {
    // Honour a harness-assigned PORT when present (preview tooling), else 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
