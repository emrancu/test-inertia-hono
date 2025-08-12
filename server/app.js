import { Hono } from 'hono'
import { inertiaMiddleware } from './inertia.js'
import { router } from './routes.js'
import { serveStatic } from '@hono/node-server/serve-static'

const app = new Hono()

app.use('*', inertiaMiddleware())

// Serve built assets in production
if (process.env.NODE_ENV === 'production') {
  app.get('/assets/*', serveStatic({ root: './dist' }))
}

app.route('/', router)

export default app