import { ExecutionContext } from "@cloudflare/workers-types";
import { Env } from "./types/declarations";
import Application from "./bootstrap/App";


export default {
	fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {

		return await Application.boot(request, env, ctx); 
	},

	async queue(_batch: any, _env: any, _ctx: any) {
		 
	},
};