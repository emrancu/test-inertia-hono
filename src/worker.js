import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'

const DEV = (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) !== 'production'
const VITE_DEV_URL = (typeof process !== 'undefined' ? process.env?.VITE_DEV_URL : undefined) || 'http://localhost:5173'

// --- HTML shell (Laravel's app.blade.php analogue) ---
const APP_HTML = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
%INERTIA_HEAD%
%ASSET_TAGS%
</head><body><div id="app" data-page='%INERTIA_PAGE%'></div></body></html>`

// --- dev/prod asset tags ---
function viteTags() {
  if (DEV) {
    const base = VITE_DEV_URL
    const preamble = `<script type="module">
import RefreshRuntime from "${base}/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
window.__vite_plugin_react_preamble_installed__ = true;
</script>`
    return [
      preamble,
      `<script type="module" src="${base}/@vite/client"></script>`,
      `<script type="module" src="${base}/resources/js/app.jsx"></script>`
    ].join('\n')
  }
  // fixed filenames from Vite build
  const cssTag = `<link rel="stylesheet" href="/assets/app.css">`
  const jsTag  = `<script type="module" src="/assets/app.js"></script>`
  return `${cssTag}\n${jsTag}`
}

// --- Inertia helpers ---
function isInertia(c) {
  return c.req.header('X-Inertia') === 'true'
}

function inertiaRender(c, component, props = {}) {
  const shared = c.get('inertia.shared') ?? {}
  const page = {
    component,
    props: { ...shared, ...props },
    url: new URL(c.req.url).pathname,
    version: c.get('inertia.version') ?? 'v1'
  }

  if (isInertia(c)) {
    return c.json(page, 200, { 'X-Inertia': 'true', 'Vary': 'Accept' })
  }

  // Add modulepreload for the page component
  const preloadTag = !DEV ? `<link rel="modulepreload" href="/assets/chunks/${component}.js">` : ''
  const tags = viteTags() + '\n' + preloadTag

  const html = APP_HTML
    .replace('%INERTIA_PAGE%', JSON.stringify(page).replace(/</g, '\\u003c'))
    .replace('%ASSET_TAGS%', tags)
    .replace('%INERTIA_HEAD%', '')

  return c.html(html)
}

function inertiaMiddleware() {
  return async (c, next) => {
    c.set('inertia.shared', {})     // add shared props here if needed
    c.set('inertia.version', 'v1')  // bump to invalidate
    await next()
  }
}

function inertiaRedirect(c, location, status = 303) {
  return c.body(null, status, { 'X-Inertia': 'true', 'Location': location })
}

// --- Hono app ---
const app = new Hono()

app.use('*', inertiaMiddleware())

// serve built assets (wrangler assets will bind to this)
app.get('/assets/*', serveStatic({ root: '' }))

// routes -> Inertia pages
app.get('/', c => inertiaRender(c, 'Home', { name: 'World' }))
app.get('/about', c => inertiaRender(c, 'About', { team: 'Hono + Inertia on Workers' }))
app.post('/go', c => inertiaRedirect(c, '/about'))

export default app
