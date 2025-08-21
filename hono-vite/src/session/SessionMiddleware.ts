import type { Context, Next } from "hono";
import { SessionManager } from "./SessionManager";
import { Cookie } from "../cookie";
import { App , AppRequest} from "../core";

declare module "hono" {
	interface ContextVariableMap {
		session: SessionManager;
	}
}

/**
 * Session middleware factory
 */
export function sessionMiddleware() {
	return async (context: Context, next: Next) => {
		// Get existing session ID from cookie
		let sessionId: string | undefined;
		
		try {
			const sessionCookie = await Cookie.get(App.config.session.cookie);
			if (sessionCookie) {
				const parsed = JSON.parse(sessionCookie);
				sessionId = parsed.sessionId;
			}
		} catch (error) {
			// Invalid session cookie, will create new session
			sessionId = undefined;
		}

		// Create session manager
		const session = new SessionManager(context, sessionId);
		
		// Initialize session data
		await session.initialize();
		
		// Set session in context
		context.set(App.config.session.cookie, session);
		
		// Process request
		await next();
		
		// Save session data after request
		await session.save();
	};
}

/**
 * Helper function to get session from context
 */
export function getSession(): SessionManager {
	const session = AppRequest.getContext().get(App.config.session.cookie);
	if (!session) {
		throw new Error("Session not initialized. Make sure session middleware is applied.");
	}
	return session;
}
