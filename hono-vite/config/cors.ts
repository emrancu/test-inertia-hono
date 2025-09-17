import { CorsConfig } from "../src/type-declaration";

/**
 * follow https://hono.dev/docs/middleware/builtin/cors#options
 */
export const corsConfig: CorsConfig = {
	origin: "*", // array or string - can be environment specific
	allowHeaders: [
		"Content-Type",
		"Authorization", 
		"X-Requested-With",
		"X-CSRF-TOKEN",    // Allow CSRF token in request headers
		"X-XSRF-TOKEN",    // Allow alternative CSRF token header
		"Access-Control-Allow-Headers"
	],
	allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH", "OPTIONS"],
	exposeHeaders: [
		"Content-Length", 
		"X-Kuma-Revision",
		"X-CSRF-TOKEN"     // Expose CSRF token in response headers
	],
	maxAge: 86400, // 24 hours (recommended for CSRF tokens)
	credentials: true, // Required for CSRF cookies and session management
};
