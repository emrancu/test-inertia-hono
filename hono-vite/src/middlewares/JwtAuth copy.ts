import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { JwtGuardConfig } from "../type-declaration";

type jwtMiddlewareOptions = {
	secret: string;
	cookie?:
		| string
		| {
				key: string;
				secret?: string;
		  };
};

class JwtAuth extends BaseMiddleware {
	private guard: string | null = null;

	public setGuard(guard?: string) {
		if (guard) {
			this.guard = guard;
		}
	}

	public async boot(context: Context, next: Next) {
		const currentGuard = this.guard ?? "api";

		// return context.json({
		// 	currentGuard: currentGuard
		// })

		const jwtConfig = App.config.auth.guards[currentGuard] as JwtGuardConfig;

		if (!jwtConfig?.useCookie) {
			throw new HTTPException(500, { message: "Invalid jwt guard" });
		}

		let options: jwtMiddlewareOptions = { secret: App.config.app.secret };

		if (jwtConfig.useCookie.status) {
			options.cookie = {
				key: jwtConfig.useCookie.key,
				secret: App.config.app.secret,
			};
		}

		return jwt(options)(context, next);
	}
}

export default JwtAuth;
