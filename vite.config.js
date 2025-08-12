import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react({ jsxRuntime: 'automatic' })],
  build: {
    outDir: 'dist',
    manifest: true,
    rollupOptions: {
      input: 'resources/js/app.jsx',
      output: { 
        chunkFileNames: 'assets/chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        entryFileNames: 'assets/[name]-[hash].js',
        manualChunks: undefined
      }
    }
  },
  server: { port: 5173, strictPort: true }
})