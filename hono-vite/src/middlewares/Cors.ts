import type { Context, Next } from "hono";
import { cors } from "hono/cors";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";

export default class Cors extends BaseMiddleware {
	public async boot(context: Context, next: Next) {
		return cors({
			origin: App.config.cors.origin,
			allowHeaders: App.config.cors.allowHeaders,
			allowMethods: App.config.cors.allowMethods,
			exposeHeaders: App.config.cors.exposeHeaders,
			maxAge: App.config.cors.maxAge,
			credentials: App.config.cors.credentials,
		})(context, next);
	}
}
