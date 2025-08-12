// @vitejs/plugin-react
import { createInertiaApp } from '@inertiajs/react'
import { createRoot } from 'react-dom/client'

const pages = import.meta.glob('./Pages/**/*.jsx', { eager: true }) // preload for dev

createInertiaApp({
  title: title => (title ? `${title} - App` : 'App'),
  resolve: name => {
    const page = pages[`./Pages/${name}.jsx`]
    if (!page) throw new Error(`Page not found: ${name}`)
    return page.default
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />)
  },
  progress: { color: '#4B5563' }
})