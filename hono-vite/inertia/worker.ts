import { Hono, type Context, type Next } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

// Detect development mode more reliably
const DEV = typeof globalThis !== 'undefined' && 
  (globalThis as any).process?.env?.NODE_ENV !== 'production' &&
  (globalThis as any).process?.env?.NODE_ENV !== undefined

const VITE_DEV_URL = (typeof globalThis !== 'undefined' && 'process' in globalThis ? (globalThis as any).process?.env?.VITE_DEV_URL : undefined) || 'http://localhost:5173'

// Static asset serving function
export async function serveAssets(c: Context) {
  if (DEV) {
    // In development, proxy to Vite dev server
    return c.redirect(`${VITE_DEV_URL}${c.req.path}`)
  }
  
  // In production, serve from dist folder
  return c.text('Asset not found', 404)
}

export function inertiaMiddleware() {
  return async (c: Context, next: Next) => {
    c.set('inertia.shared', {})
    c.set('inertia.version', 'v1')
    await next()
  }
}


export function inertiaRedirect(c: Context, location: string, status: number = 303) {
  return c.body(null, status as any, { 'X-Inertia': 'true', 'Location': location })
}

// Hono app
// const app = new Hono()
// app.use('*', inertiaMiddleware())
// app.get('/assets/*', serveStatic({ root: '.', manifest: {} }))
// app.get('/', (c: Context) => inertiaRender(c, 'Home', { name: 'World' }))
// app.get('/about', (c: Context) => inertiaRender(c, 'About', { team: 'Hono + Inertia on Workers' }))
// app.post('/go', (c: Context) => inertiaRedirect(c, '/about'))

// export default app