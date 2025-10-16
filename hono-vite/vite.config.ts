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
    flyingWorker({
      appPath: 'resources/js',
      // outDir: 'dist', // optional, defaults to 'dist'
      // assetsDir: 'assets', // optional, defaults to 'assets'
    })
  ] as PluginOption[],
})