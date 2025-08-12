import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    manifest: true,
    rollupOptions: {
      input: 'resources/js/app.jsx',
      output: {
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
      manualChunks(id) {
        if (id.includes('/resources/js/Pages/')) {
          const file = path.basename(id, path.extname(id))
          return `Pages_${file}`
        }
      },
    },
  },
  server: { port: 5173, strictPort: true }
})