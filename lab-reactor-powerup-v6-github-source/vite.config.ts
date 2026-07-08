import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  // Critical for GitHub Pages project sites: assets must be relative, not /assets/.
  base: './',
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        app: resolve(__dirname, 'app.html'),
        connector: resolve(__dirname, 'trello-connector.html'),
      },
    },
  },
});
