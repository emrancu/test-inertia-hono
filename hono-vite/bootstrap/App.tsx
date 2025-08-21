import { ExecutionContext } from "@cloudflare/workers-types";
import { Hono } from "hono";
import { App } from "../src/core";
import { Env } from "../types/declarations";
import {renderer} from "../src/renderer";

let HonoApp: Hono|null = null;

const initApp = async (queue = false) => {
	const config = await import("../config");

	HonoApp = new Hono()

	HonoApp.use(renderer) 
	
 	await App.boot(HonoApp, config.default, queue);
};

export default {
	boot: async (request: Request, env: Env, ctx: ExecutionContext) => {
	 
		App.setRequest(request);

		if (!HonoApp) {
			App.setEnv(env);

			await initApp();
		}

		return HonoApp?.fetch(request, env, ctx);
	},
	bootQueue: async (env: Env, ctx: ExecutionContext) => {
		if (!HonoApp) {
			App.setEnv(env);

			await initApp(true);
		}
	},
};
