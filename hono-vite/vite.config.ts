import { cloudflare } from '@cloudflare/vite-plugin'
import { defineConfig } from 'vite'
import ssrPlugin from 'vite-ssr-components/plugin'

export default defineConfig({
  server: {
    cors: false, // disable Vite's built-in CORS setting
  },
  plugins: [cloudflare(), ssrPlugin()]
})
