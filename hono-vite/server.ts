import { Hono } from 'hono'
import { renderer } from './src/renderer'
import { ExecutionContext } from "@cloudflare/workers-types";
import { Env } from "./types/declarations";
import Application from "./bootstrap/App";

// const app = new Hono()
//
// app.use(renderer)


// app.get('/', (c) => {
//   return c.render(<h1>Hello ss!</h1>)
// })


export default {
	fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {

		return await Application.boot(request, env, ctx); 
	},

	async queue(batch: any , env: any, ctx: any) {
		 
	},
};