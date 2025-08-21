import type { Context, Next } from "hono";
import { Cookie } from "../cookie";
import { App, AppRequest } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { getSession } from "../session";

export default class CsrfToken extends BaseMiddleware {
	protected isExceptPath = (path: string) => {
		return App.config.csrf.except.some((pattern) => {
			if (pattern.endsWith("*")) {
				return path.startsWith(pattern.slice(0, -1));
			}

			return path === pattern;
		});
	};

	/**
	 * Validate request origin to prevent simple CSRF attacks
	 */
	private validateOrigin(context: Context): boolean {
		const origin = context.req.header("Origin");
		const referer = context.req.header("Referer");
		const host = context.req.header("Host");
		const userAgent = context.req.header("User-Agent");
		
		// Get allowed origins from config or use host
		const allowedOrigins = App.config.csrf.allowedOrigins || [
			`http://${host}`,
			`https://${host}`,
			`http://localhost:8787`,
			`https://localhost:8787`
		];

		// 1. Check Origin header (sent by browsers on POST/PUT/DELETE/PATCH)
		if (origin) {
			const isValidOrigin = allowedOrigins.some(allowed => 
				origin === allowed || origin.startsWith(allowed)
			);
			if (!isValidOrigin) {
				console.warn(`Invalid origin: ${origin}, allowed: ${allowedOrigins.join(', ')}`);
				return false;
			}
		}

		// 2. Check Referer header (fallback if no Origin)
		if (!origin && referer) {
			const isValidReferer = allowedOrigins.some(allowed => 
				referer.startsWith(allowed)
			);
			if (!isValidReferer) {
				console.warn(`Invalid referer: ${referer}, allowed: ${allowedOrigins.join(', ')}`);
				return false;
			}
		}

		// 3. Detect suspicious User-Agent patterns (optional)
		if (userAgent && this.isSuspiciousUserAgent(userAgent)) {
			console.warn(`Suspicious User-Agent: ${userAgent}`);
			return false;
		}

		return true;
	}

	/**
	 * Detect suspicious user agents (curl, wget, etc.)
	 */
	private isSuspiciousUserAgent(userAgent: string): boolean {
		const suspiciousPatterns = [
			/^curl\//i,
			/^wget\//i,
			/^python-requests\//i,
			/^node-fetch\//i,
			/^axios\//i,
			/postman/i,
			/insomnia/i
		];
		
		return suspiciousPatterns.some(pattern => pattern.test(userAgent));
	}

	/**
	 * Get CSRF token from multiple sources (like Laravel)
	 */
	private getTokenFromRequest(context: Context): string | null {
		// Check multiple sources in priority order
		return context.req.header("X-CSRF-TOKEN") ||
			   context.req.header("X-XSRF-TOKEN") ||
			   AppRequest.input("_token") ||
			   AppRequest.input("csrf_token");
	}

	/**
	 * Validate request timing to prevent replay attacks
	 */
	private validateRequestTiming(context: Context): boolean {
		const timestamp = context.req.header("X-Request-Time");
		if (!timestamp) return true; // Optional header
		
		const requestTime = parseInt(timestamp);
		const now = Date.now() / 1000;
		const maxAge = 300; // 5 minutes
		
		return (now - requestTime) <= maxAge;
	}

	/**
	 * Rate limiting check (basic implementation)
	 */
	private async checkRateLimit(context: Context): Promise<boolean> {
		const ip = context.req.header("CF-Connecting-IP") || 
				   context.req.header("X-Forwarded-For") || 
				   context.req.header("X-Real-IP") || 
				   "unknown";
		
		// In a real implementation, you'd use Redis or KV for rate limiting
		// For now, just log suspicious activity
		const userAgent = context.req.header("User-Agent") || "unknown";
		
		if (this.isSuspiciousUserAgent(userAgent)) {
			console.warn(`Rate limit warning for IP: ${ip}, UA: ${userAgent}`);
			// In production, implement actual rate limiting here
		}
		
		return true; // Allow for now
	}

	/**
	 * Ensure session has a valid CSRF token
	 */
	private async ensureSessionToken(context: Context): Promise<string> {
		const session = getSession();
		
		let sessionToken = session.get('_csrf_token');
		
		if (!sessionToken) {
			// Generate new session-based token
			sessionToken = crypto.randomUUID();
			session.set('_csrf_token', sessionToken);
		}
		
		// Also set as XSRF-TOKEN cookie for frontend JavaScript (less secure but convenient)
		Cookie.set("XSRF-TOKEN", sessionToken);
		
		return sessionToken;
	}

	public async boot(context: Context, next: Next) {
		// Skip CSRF for API routes or excluded paths
		if (context.req.path.startsWith("api") || this.isExceptPath(context.req.path)) {
			await next();
			return;
		}

		const isStateChanging = ["POST", "PUT", "DELETE", "PATCH"].includes(context.req.method);
		let tokenSuccess = true;

		if (isStateChanging) {
			// 1. Rate limiting check
			if (!(await this.checkRateLimit(context))) {
				return context.json({ 
					error: "Rate limit exceeded", 
					code: "RATE_LIMIT" 
				}, 429);
			}

			// 2. Origin validation (primary defense against CSRF)
			if (!this.validateOrigin(context)) {
				return context.json({ 
					error: "Invalid origin - potential CSRF attack detected", 
					code: "INVALID_ORIGIN" 
				}, 403);
			}

			// 3. Request timing validation
			if (!this.validateRequestTiming(context)) {
				return context.json({ 
					error: "Request timestamp invalid", 
					code: "INVALID_TIMESTAMP" 
				}, 403);
			}

			// 4. CSRF token validation
			const session = getSession();
			const sessionToken = session.get('_csrf_token');
			const requestToken = this.getTokenFromRequest(context);

			if (!sessionToken) {
				return context.json({ 
					error: "No CSRF token in session", 
					code: "NO_SESSION_TOKEN" 
				}, 422);
			}

			if (!requestToken) {
				return context.json({ 
					error: "Missing CSRF token in request", 
					code: "MISSING_TOKEN" 
				}, 422);
			}

			// Use timing-safe comparison
			if (sessionToken.length !== requestToken.length) {
				tokenSuccess = false;
			} else {
				let result = 0;
				for (let i = 0; i < sessionToken.length; i++) {
					result |= sessionToken.charCodeAt(i) ^ requestToken.charCodeAt(i);
				}
				tokenSuccess = result === 0;
			}

			if (!tokenSuccess) {
				// Log potential attack
				console.warn('CSRF token mismatch:', {
					ip: context.req.header("CF-Connecting-IP") || "unknown",
					userAgent: context.req.header("User-Agent") || "unknown",
					origin: context.req.header("Origin") || "unknown",
					referer: context.req.header("Referer") || "unknown",
					path: context.req.path,
					method: context.req.method
				});

				return context.json({ 
					error: "CSRF token mismatch", 
					code: "TOKEN_MISMATCH" 
				}, 422);
			}
		}

		// Ensure token exists and is available to frontend
		const csrfToken = await this.ensureSessionToken(context);
		App.addToCurrentState("csrfToken", csrfToken);

		await next();
	}
}
