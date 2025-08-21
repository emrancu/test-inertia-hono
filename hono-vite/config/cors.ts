import { CorsConfig } from "../src/type-declaration";

/**
 * follow https://hono.dev/docs/middleware/builtin/cors#options
 */
export const corsConfig: CorsConfig = {
	origin: "*", // array or string
	allowHeaders: ["Access-Control-Allow-Headers"],
	allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
	exposeHeaders: ["Content-Length", "X-Kuma-Revision"],
	maxAge: 600,
	credentials: true,
};
