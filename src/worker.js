import { Hono } from 'hono'
import { serveStatic } from 'hono/cloudflare-workers'
import { viteManifest } from './manifest.data'

const DEV = false 
// const DEV = (typeof process !== 'undefined' ? process.env?.NODE_ENV : undefined) !== 'production'
const VITE_DEV_URL = (typeof process !== 'undefined' ? process.env?.VITE_DEV_URL : undefined) || 'http://localhost:5173'

const APP_HTML = `<!doctype html><html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
%INERTIA_HEAD%
%ASSET_TAGS%
</head><body><div id="app" data-page='%INERTIA_PAGE%'></div></body></html>`

function devTags() {
  const base = VITE_DEV_URL
  const preamble = `<script type="module">
import RefreshRuntime from "${base}/@react-refresh";
RefreshRuntime.injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (t) => t;
window.__vite_plugin_react_preamble_installed__ = true;
</script>`
  return [
    preamble,
    `<script type="module" src="${base}/@vite/client"></script>`,
    `<script type="module" src="${base}/resources/js/app.jsx"></script>`,
  ].join('\n')
}

function prodEntryTags() {
  const entry = viteManifest['resources/js/app.jsx']
  const css = (entry?.css ?? []).map(h => `<link rel="stylesheet" href="/${h}">`).join('\n')
  const js  = entry ? `<script type="module" src="/${entry.file}"></script>` : ''
  return `${css}\n${js}`
}

function preloadForPage(component) {
  const candidates = [
    `resources/js/Pages/${component}.jsx`,
    `resources/js/Pages/${component}.tsx`,
    `resources/js/Pages/${component}/Index.jsx`,
    `resources/js/Pages/${component}/Index.tsx`,
  ]
  const key = candidates.find(k => viteManifest[k])
  if (!key) return ''

  const seen = new Set()
  const tags = []

  const walk = (k) => {
    if (seen.has(k)) return
    seen.add(k)
    const e = viteManifest[k]
    if (!e) return
    if (e.file) tags.push(`<link rel="modulepreload" href="/${e.file}">`)
    for (const imp of e.imports ?? []) walk(imp)
    for (const css of e.css ?? []) tags.push(`<link rel="stylesheet" href="/${css}">`)
  }

  walk(key)
  return tags.join('\n')
}

function assetTagsFor(component) {
  return DEV ? devTags() : `${prodEntryTags()}\n${preloadForPage(component)}`
}

// --- Inertia helpers ---
function isInertia(c) { return c.req.header('X-Inertia') === 'true' }

function inertiaMiddleware() {
  return async (c, next) => {
    c.set('inertia.shared', {})
    c.set('inertia.version', 'v1')
    await next()
  }
}

function inertiaRender(c, component, props = {}) {
  const shared = c.get('inertia.shared') ?? {}
  const page = {
    component,
    props: { ...shared, ...props },
    url: new URL(c.req.url).pathname,
    version: c.get('inertia.version') ?? 'v1'
  }

  if (isInertia(c)) return c.json(page, 200, { 'X-Inertia': 'true', 'Vary': 'Accept' })

  const html = APP_HTML
    .replace('%INERTIA_PAGE%', JSON.stringify(page).replace(/</g, '\\u003c'))
    .replace('%ASSET_TAGS%', assetTagsFor(component))
    .replace('%INERTIA_HEAD%', '')

  return c.html(html)
}

function inertiaRedirect(c, location, status = 303) {
  return c.body(null, status, { 'X-Inertia': 'true', 'Location': location })
}

// Hono app
const app = new Hono()
app.use('*', inertiaMiddleware())
app.get('/assets/*', serveStatic({ root: '' }))
app.get('/', c => inertiaRender(c, 'Home', { name: 'World' }))
app.get('/about', c => inertiaRender(c, 'About', { team: 'Hono + Inertia on Workers' }))
app.post('/go', c => inertiaRedirect(c, '/about'))

export default app