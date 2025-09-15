import type { Context, Next } from "hono";
import { Cookie } from "../cookie";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { sessionMiddleware } from "../session";

export default class Session extends BaseMiddleware {
	protected isAvoidPath = (path: string) => {
		return App.config.session.avoidPath.some((pattern) => {
			if (pattern.endsWith("*")) {
				return path.startsWith(pattern.slice(0, -1));
			}

			return path === pattern; // Exact match for paths like 'product/'
		});
	};

	public async boot(context: Context, next: Next) {
		if (!this.isAvoidPath(context.req.path)) {
			// Use our custom session middleware
			App.addToCurrentState("is_active_session_middleware", true);

			return await sessionMiddleware()(context, next);
		} else {
			await next();
		}
	}
}
