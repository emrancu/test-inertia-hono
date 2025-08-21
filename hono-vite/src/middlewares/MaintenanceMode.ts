import type { Context, Next } from "hono";
import { App } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";

class MaintenanceMode extends BaseMiddleware {
	public async boot(context: Context, next: Next) {
		if (App.config.app.maintenance.status) {
			return context.html(App.config.app.maintenance.message);
		}

		await next();
	}
}

export default MaintenanceMode;
