import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
 

export default defineConfig({
  server: {
    cors: false, // disable Vite's built-in CORS setting
  },
  plugins: [
      cloudflare(),
  ]
})
