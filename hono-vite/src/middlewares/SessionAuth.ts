import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { SessionAuth as Auth } from "../auth";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { SessionGuardConfig } from "../type-declaration/config";

class SessionAuth extends BaseMiddleware {
	protected redirectPath = "/login";

	private guard: string | null = null;

	public setGuard(guard?: string) {
		if (guard) {
			this.guard = guard;
		}
	}

	public async boot(context: Context, next: Next) {
		const currentGuard = this.guard ?? App.config.auth.defaultGuard;

		const jwtConfig = App.config.auth.guards[
			currentGuard
		] as SessionGuardConfig;
		if (jwtConfig.driver !== "session") {
			throw new HTTPException(500, { message: "Invalid session guard" });
		}

		if (!Auth.check(currentGuard)) {
			return context.redirect(this.redirectPath, 302);
		}

		return await next();
	}
}

export default SessionAuth;
