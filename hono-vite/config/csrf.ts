import { CsrfTokenConfig } from "../src/type-declaration";

/**
 * not for /api/*
 * follow https://hono.dev/docs/middleware/builtin/cors#options
 * But we change the way , we added csrf token system that must be pass with form submitting
 * u can get csrf token with csrf() import {csrf} from 'flying-worker/supports
 */
export const CsrfConfig: CsrfTokenConfig = {
	origin: "same",
	avoidPath: ['/api/*'], // except routes
	allowedOrigins: [
		"http://localhost:8787",
		"https://localhost:8787",
	],
	validateUserAgent: true, // Block suspicious user agents (curl, wget, etc.)
	rateLimit: {
		enabled: true,
		maxRequests: 100, // Max requests per window
		windowMs: 900000, // 15 minutes
	}
};
