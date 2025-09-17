import type { Context, Next } from "hono";
import { cors } from 'hono/cors';
import { Cookie } from "../cookie";
import { App, AppRequest } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { Session } from "../session";

export default class CsrfToken extends BaseMiddleware {

	protected isExceptPath = (path: string) => {
		return App.config.csrf.avoidPath.some((pattern) => {
			if (pattern.endsWith("*")) {
				return path.startsWith(pattern.slice(0, -1));
			}

			return path === pattern;
		});
	};

	/**
	 * Get allowed origins for CORS (reused from CSRF validation)
	 */
	private getAllowedOrigins(context: Context): string[] {
		const host = context.req.header("Host");
		return App.config.csrf.allowedOrigins || [
			`http://${host}`,
			`https://${host}`,
			`http://localhost:8787`,
			`https://localhost:8787`
		];
	}

	/**
	 * Validate request origin to prevent simple CSRF attacks (Laravel-style)
	 */
	private validateOrigin(context: Context): boolean {
		const origin = context.req.header("Origin");
		const referer = context.req.header("Referer");
		const host = context.req.header("Host");
		
		// Get allowed origins from config or use host
		const allowedOrigins = App.config.csrf.allowedOrigins || [
			`http://${host}`,
			`https://${host}`,
			`http://localhost:8787`,
			`https://localhost:8787`
		];

		// Check Origin header (sent by browsers on POST/PUT/DELETE/PATCH)
		if (origin) {
			const isValidOrigin = allowedOrigins.some(allowed => 
				origin === allowed || origin.startsWith(allowed)
			);
			
			if (!isValidOrigin) {
				console.warn(`CSRF: Invalid origin: ${origin}`);
				return false;
			}
		}

		// Check Referer header (fallback if no Origin)
		if (!origin && referer) {
			const isValidReferer = allowedOrigins.some(allowed => 
				referer.startsWith(allowed)
			);
			if (!isValidReferer) {
				console.warn(`CSRF: Invalid referer: ${referer}`);
				return false;
			}
		}

		return true;
	}

	/**
	 * Get CSRF token from request (Laravel-style priority)
	 */
	private getTokenFromRequest(context: Context): string | null {
		// Priority order: X-CSRF-TOKEN (from XSRF-TOKEN cookie), X-XSRF-TOKEN, _token form field
		return context.req.header("X-CSRF-TOKEN") ||
			   context.req.header("X-XSRF-TOKEN") ||
			   AppRequest.input("_token") ||
			   AppRequest.input("csrf_token");
	}

	/**
	 * Generate a cryptographically secure random token (Laravel uses 40 chars)
	 */
	private generateToken(): string {
		const array = new Uint8Array(20); // 20 bytes = 40 hex chars
		crypto.getRandomValues(array);
		return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
	}

	/**
	 * Ensure session has a valid CSRF token (Laravel-style)
	 */
	private ensureSessionToken(): string {
		let sessionToken = Session.get('_token');
		
		if (!sessionToken) {
			// Generate new session-based token (Laravel uses 40 char hex string)
			sessionToken = this.generateToken();
			Session.put('_token', sessionToken);
		}
		
		// Set XSRF-TOKEN cookie for JavaScript access (Laravel behavior)
		// This allows Axios/Inertia to read the token and send it in X-CSRF-TOKEN header
		Cookie.set("XSRF-TOKEN", sessionToken, null);
		
		return sessionToken;
	}

	/**
	 * Timing-safe string comparison (prevents timing attacks)
	 */
	private timingSafeEquals(a: string, b: string): boolean {
		if (a.length !== b.length) {
			return false;
		}
		
		let result = 0;
		for (let i = 0; i < a.length; i++) {
			result |= a.charCodeAt(i) ^ b.charCodeAt(i);
		}
		
		return result === 0;
	}

	public async boot(context: Context, next: Next) {

		if (App.getCurrentState("is_active_session_middleware")){
			await next();
			return;
		}

		// Apply CORS middleware first
		const corsHandler = cors({
			origin: App.config.cors?.origin || this.getAllowedOrigins(context),
			allowMethods: App.config.cors?.allowMethods || ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH', 'OPTIONS'],
			allowHeaders: App.config.cors?.allowHeaders || [
				'X-CSRF-TOKEN', 
				'X-XSRF-TOKEN', 
				'Content-Type', 
				'Authorization',
				'X-Requested-With'
			],
			exposeHeaders: App.config.cors?.exposeHeaders || ['X-CSRF-TOKEN'],
			credentials: App.config.cors?.credentials ?? true,
			maxAge: App.config.cors?.maxAge || 86400
		});

		// Apply CORS first, then handle CSRF
		await corsHandler(context, async () => {
			// Skip CSRF for GET/HEAD/OPTIONS or excluded paths
			if (["GET", "HEAD", "OPTIONS"].includes(context.req.method) || 
				this.isExceptPath(context.req.path)) {
				// Still generate token for GET requests so forms can use it
				const csrfToken = this.ensureSessionToken();
				App.addToCurrentState("csrfToken", csrfToken);
				await next();
				return;
			}

			// For state-changing requests (POST, PUT, DELETE, PATCH)
			const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(context.req.method);

			if (isStateChanging) {
				// 1. Origin/Referer validation (primary CSRF defense)
				if (!this.validateOrigin(context)) {
					throw new Error('CSRF_ORIGIN_MISMATCH');
				}

				// 2. Token validation (double-submit cookie pattern)
				const sessionToken = Session.get('_token');
				const requestToken = this.getTokenFromRequest(context);

				if (!sessionToken || !requestToken) {
					throw new Error('CSRF_TOKEN_MISSING');
				}

				// Timing-safe comparison (prevent timing attacks)
				if (!this.timingSafeEquals(sessionToken, requestToken)) {
					// Log potential attack
					console.warn('CSRF token mismatch:', {
						ip: context.req.header("CF-Connecting-IP") || "unknown",
						userAgent: context.req.header("User-Agent")?.substring(0, 100) || "unknown",
						origin: context.req.header("Origin") || "unknown",
						referer: context.req.header("Referer") || "unknown",
						path: context.req.path,
						method: context.req.method
					});

					throw new Error('CSRF_TOKEN_MISMATCH');
				}
			}

			// Ensure token exists and is available to frontend
			const csrfToken = this.ensureSessionToken();
			App.addToCurrentState("csrfToken", csrfToken);

			await next();
		}).catch((error) => {
			// Handle CSRF errors after CORS is applied
			if (error.message?.startsWith('CSRF_')) {
				return context.json({ 
					message: "CSRF token mismatch.",
					errors: {}
				}, 422);
			}
			throw error; // Re-throw non-CSRF errors
		});
	}
}
