import { Hono } from 'hono'
import { renderer } from './src/renderer'

const app = new Hono()

app.use(renderer)

app.get('/', (c) => {
  return c.render(<h1>Hello!</h1>)
})


export default {
	fetch: async (request: any, env: any, ctx: any) => {
		return await app.fetch(request, env, ctx);
	},

	async queue(batch: any , env: any, ctx: any) {
		 
	},
};