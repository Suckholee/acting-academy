import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  publicDir: 'dist',
  build: {
    outDir: 'dist-react',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false
  },
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, './src')
    }
  }
});
