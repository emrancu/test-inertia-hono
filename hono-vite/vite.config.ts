import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import flyingWorker from './src/inertia/vite-plugin.js'

export default defineConfig({
  server: {
    cors: false, // disable Vite's built-in CORS setting
    port: 5173, 
    strictPort: true
  },
  plugins: [
    react(),
    cloudflare(),
    flyingWorker()
  ] as PluginOption[],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    rollupOptions: {
      input: 'resources/js/app.jsx',
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
        manualChunks(id: string) {
          if (id.includes('/resources/js/Pages/')) {
            const segments = id.split('/');
            const fileName = segments[segments.length - 1];
            const fileNameWithoutExt = fileName.replace(/\.[^/.]+$/, "");
            return `Pages_${fileNameWithoutExt}`;
          }
        },
      },
    },
  },
})