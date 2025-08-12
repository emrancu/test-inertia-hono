import fs from 'node:fs'
import path from 'node:path'

const DEV = process.env.NODE_ENV !== 'production'
const VITE_DEV_URL = process.env.VITE_DEV_URL ?? 'http://localhost:5173'
const manifestPath = path.resolve('dist/.vite/manifest.json')
const appHtmlPath = path.resolve('resources/views/app.html')

function viteTags() {
  if (DEV) {
    const base = VITE_DEV_URL
    const preamble = `
<script type="module">
  import RefreshRuntime from "${base}/@react-refresh"
  RefreshRuntime.injectIntoGlobalHook(window)
  window.$RefreshReg$ = () => {}
  window.$RefreshSig$ = () => (type) => type
  window.__vite_plugin_react_preamble_installed__ = true
</script>`
    return [
      preamble, // must come first
      `<script type="module" src="${base}/@vite/client"></script>`,
      `<script type="module" src="${base}/resources/js/app.jsx"></script>`
    ].join("\n")
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  const entry = manifest['resources/js/app.jsx']
  if (!entry) throw new Error('Vite manifest missing entry resources/js/app.jsx')
  const js = `<script type="module" src="/${entry.file}"></script>`
  const css = (entry.css ?? []).map(href => `<link rel="stylesheet" href="/${href}">`).join('\n')
  return `${css}\n${js}`
}

export function inertiaMiddleware() {
  return async (c, next) => {
    c.set('inertia.shared', { })          // put shared props here
    c.set('inertia.version', 'v1')        // bump to invalidate
    await next()
  }
}

function isInertia(c) {
  return c.req.header('X-Inertia') === 'true'
}

export function inertiaRender(c, component, props = {}) {
  const shared = c.get('inertia.shared') ?? {}
  const page = {
    component,
    props: { ...shared, ...props },
    url: new URL(c.req.url).pathname,
    version: c.get('inertia.version')
  }

  if (isInertia(c)) {
    return c.json(page, 200, { 'X-Inertia': 'true', 'Vary': 'Accept' })
  }

  const html = fs.readFileSync(appHtmlPath, 'utf8')
    .replace('%INERTIA_PAGE%', JSON.stringify(page).replace(/</g, '\\u003c'))
    .replace('%VITE_ASSETS%', viteTags())
    .replace('%INERTIA_HEAD%', '')
  return c.html(html)
}

export function inertiaRedirect(c, location, status = 303) {
  return c.body(null, status, { 'X-Inertia': 'true', 'Location': location })
}