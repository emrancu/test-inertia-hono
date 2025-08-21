
import {
	Session,
	Cors,
	CsrfToken,
	MaintenanceMode,
} from "../src/middlewares";
import { MiddlewaresConfig } from "../src/type-declaration";

/**
 * follow https://hono.dev/docs/middleware/builtin/cors#options
 * But we change the way , we added csrf token system that must be pass with form submitting
 * u can get csrf token with csrf() import {csrf} from 'flying-worker/supports
 */
export const middlewaresConfig: MiddlewaresConfig = {
	global: [
		MaintenanceMode
	],
	/**
	 * middleware for web routes except 'api/*' routes
	 */
	web: [
		CsrfToken,
		Session
	],

	/**
	 * apply middleware for 'api/*'
	 */
	api: [
		Cors
	],

	/**
	 * here we added middleware for ReactRouter page register and hono middleware apply on ReactRouter from routes/reactRoutes.ts
	 */
	reactRouter: [],

	aliases: {
		// sessionAuth: SessionAuth,
		// jwtAuth: JwtAuth,
	},
};
