import type { Context, Next } from "hono";
import { Session } from "./index";

export function sessionMiddleware() {
	return async (next: Next) => {
		await Session.initialize();
		await next();
		await Session.save();
	};
}

