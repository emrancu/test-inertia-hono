import { Context, Next } from "hono";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { ReactMiddlewareByPath } from "../route";

abstract class ReactRouteMiddlewareApply extends BaseMiddleware {
	protected abstract loadRoutes(): Promise<void>;

	public async boot(context: Context, next: Next) {
		await this.loadRoutes();

		const pathname = new URL(context.req.url).pathname;

		const matchedMiddleware: string[] = ReactMiddlewareByPath(pathname);
		if (matchedMiddleware.length) {
			for (const alias of matchedMiddleware) {
				const middleware = App.config.middlewares.aliases[alias];

				const instance: BaseMiddleware = new middleware();

				const result = await instance.boot(context, async () => {
					return;
				});

				if (result !== undefined) {
					return result;
				}
			}
		}

		return await next();
	}
}

export default ReactRouteMiddlewareApply;
