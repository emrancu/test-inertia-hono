import { Hono } from 'hono'
import { inertiaRender, inertiaRedirect } from './inertia.js'

export const router = new Hono()

router.get('/', c => inertiaRender(c, 'Home', { name: 'World' }))
router.get('/about', c => inertiaRender(c, 'About', { team: 'Hono + Inertia' }))

router.post('/do-something', async c => {
  // ... work
  return inertiaRedirect(c, '/about')
})
