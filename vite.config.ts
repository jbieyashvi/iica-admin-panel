import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Honour a harness-assigned PORT when present (preview tooling), else 5173.
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
});
