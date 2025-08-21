import { CsrfTokenConfig } from "../src/type-declaration";

/**
 * not for /api/*
 * follow https://hono.dev/docs/middleware/builtin/cors#options
 * But we change the way , we added csrf token system that must be pass with form submitting
 * u can get csrf token with csrf() import {csrf} from 'flying-worker/supports
 */
export const CsrfConfig: CsrfTokenConfig = {
	origin: "same",
	except: [], // except routes
	allowedOrigins: [
		"http://localhost:8787",
		"https://localhost:8787",
		// Add your production domains here
		// "https://yourdomain.com",
		// "https://www.yourdomain.com"
	],
	validateUserAgent: true, // Block suspicious user agents (curl, wget, etc.)
	rateLimit: {
		enabled: true,
		maxRequests: 100, // Max requests per window
		windowMs: 900000, // 15 minutes
	}
};
