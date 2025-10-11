import { type Context } from 'hono'
import { viteManifest } from '../../inertia/manifest.data'
import appHtmlTemplate from '../../resources/views/app.html?raw'

// Detect development mode more reliably
const DEV = typeof globalThis !== 'undefined' && 
  (globalThis as any).process?.env?.NODE_ENV !== 'production' &&
  (globalThis as any).process?.env?.NODE_ENV !== undefined

const VITE_DEV_URL = (typeof globalThis !== 'undefined' && 'process' in globalThis ? (globalThis as any).process?.env?.VITE_DEV_URL : undefined) || 'http://localhost:5173'

function devTags(): string {
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

function prodEntryTags(): string {
  const entry = viteManifest['resources/js/app.jsx']
  const css = ((entry as any)?.css ?? []).map((h: string) => `<link rel="stylesheet" href="/${h}">`).join('\n')
  const js  = entry ? `<script type="module" src="/${entry.file}"></script>` : ''
  return `${css}\n${js}`
}

function preloadForPage(component: string): string {
  const candidates = [
    `resources/js/Pages/${component}.jsx`,
    `resources/js/Pages/${component}.tsx`,
    `resources/js/Pages/${component}/Index.jsx`,
    `resources/js/Pages/${component}/Index.tsx`,
  ]
  const key = candidates.find(k => (viteManifest as any)[k])
  if (!key) return ''

  const seen = new Set<string>()
  const tags: string[] = []

  const walk = (k: string): void => {
    if (seen.has(k)) return
    seen.add(k)
    const e = (viteManifest as any)[k]
    if (!e) return
    if (e.file) tags.push(`<link rel="modulepreload" href="/${e.file}">`)
    for (const imp of (e.imports ?? [])) walk(imp)
    for (const css of ((e as any).css ?? [])) tags.push(`<link rel="stylesheet" href="/${css}">`)
  }

  walk(key)
  return tags.join('\n')
}

function assetTagsFor(component: string): string {
  if (DEV) {
    return devTags()
  }
  return `${prodEntryTags()}\n${preloadForPage(component)}`
}

// --- Inertia helpers ---
function isInertia(c: Context): boolean { 
  return c.req.header('X-Inertia') === 'true' 
}

export function inertiaRender(c: Context, component: string, props: Record<string, any> = {}) {
  const shared = c.get('inertia.shared') ?? {}
  const page = {
    component,
    props: { ...shared, ...props },
    url: new URL(c.req.url).pathname,
    version: c.get('inertia.version') ?? 'v1'
  }

  if (isInertia(c)) return c.json(page, 200, { 'X-Inertia': 'true', 'Vary': 'Accept' })

  const html = appHtmlTemplate
    .replace('%INERTIA_PAGE%', JSON.stringify(page).replace(/</g, '\\u003c'))
    .replace('%VITE_ASSETS%', assetTagsFor(component))
    .replace('%INERTIA_HEAD%', '')

  return c.html(html)
}
