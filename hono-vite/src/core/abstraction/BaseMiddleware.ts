import type { Context, Next } from "hono";

abstract class BaseMiddleware {
	abstract boot(
		context: Context,
		next: Next,
	): Promise<Response | void | undefined>;
}

export default BaseMiddleware;
