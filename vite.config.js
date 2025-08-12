import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    manifest: true, // => writes dist/.vite/manifest.json
    rollupOptions: { input: 'resources/js/app.jsx' },
  },
  server: { port: 5173, strictPort: true }
})