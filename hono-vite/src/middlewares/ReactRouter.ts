import type { Context, Next } from "hono";
import { createRequestHandler } from "react-router";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";

class ReactRouter extends BaseMiddleware {
	public async boot(context: Context, next: Next) {
		const requestHandler = createRequestHandler(
			// @ts-ignore
			() => import("virtual:react-router/server-build"),
			import.meta.env.MODE,
		);

		return requestHandler(context.req.raw, {
			cloudflare: { ctx: context },
		});
	}
}

export default ReactRouter;
