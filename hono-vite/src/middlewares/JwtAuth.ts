import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";
import { jwt } from "hono/jwt";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { JwtGuardConfig, JwtMiddlewareOptions } from "../type-declaration";


class JwtAuth extends BaseMiddleware {
	protected guardsName: string | null = null;

	/**
	 * Get current guard name or default
	 */
	private getCurrentGuard(context: Context): string {
		if (this.guardsName) {
			return this.guardsName;
		}
		
		// Try to detect if this is an API request or Web request
		try {
			const path = context.req.path || "";
			const isApiRequest = path.startsWith("/api");
			
			return isApiRequest 
				? App.config.auth.defaultApiGuard 
				: App.config.auth.defaultWebGuard;
		} catch (error) {
			return App.config.auth.defaultApiGuard;
		}
	}

	/**
	 * Get guard configuration
	 */
	private getGuardConfig(guardName: string): JwtGuardConfig {
		const guardConfig = App.config.auth.guards[guardName];
		
		if (!guardConfig) {
			throw new HTTPException(500, { 
				message: `Guard "${guardName}" not found in configuration` 
			});
		}

		if (guardConfig.driver !== "jwt") {
			throw new HTTPException(500, { 
				message: `Guard "${guardName}" is not a JWT guard` 
			});
		}
		
		return guardConfig as JwtGuardConfig;
	}

	public async boot(context: Context, next: Next) {
		const currentGuard = this.getCurrentGuard(context);
		const jwtConfig = this.getGuardConfig(currentGuard);

		let options: JwtMiddlewareOptions = { 
			secret: App.config.app.secret 
		};

		// Configure cookie-based JWT if enabled (optional)
		if (jwtConfig.useCookie?.status) {
			options.cookie = {
				key: jwtConfig.useCookie.key,
				secret: App.config.app.secret,
			};
		}

		return jwt(options)(context, next);
	}
}

export default JwtAuth;
