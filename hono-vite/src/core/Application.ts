import { Context, Hono, Next } from "hono";
import { AppRequest } from "../core";
import { Route } from "../route";

import {
	AuthenticatedUser,
	Config,
	MiddlewareClass,
	MiddlewareInstance,
} from "../type-declaration";
import { setRequest } from "./request";
import { setEnv, setContext } from "./request";
import {Container} from "./container";

const middlewareInstances = new Map<MiddlewareClass, MiddlewareInstance>();

class Application {
	public hono!: Hono;
	public config!: Config;
	public context!: Context;
	public container!: Container;

	private currentStates: {
		authUser?: AuthenticatedUser | null;
		[key: string]: unknown;
	} = {};

	public apiPrefix = "api";

	constructor() {
	}

	public async boot(app: Hono, config: Config, queue = false) {
		this.config = config;
		this.hono = app

		if (Object.keys(this.config.app).length === 0) {
			throw new Error("App Configuration not set");
		}

		if (queue) {
			return;
		}

		this.basicInit();

		this.activeGlobalMiddleware();

		this.activeApiMiddleware();

		this.activeWebMiddleware();

		await this.initiateHonoRoute();

		this.activePoweredByMiddleware();
	}

	loadConfig(config: Config) {
		this.config = config;
	}

	getContext(): Context
	{
		return this.context;
	}

	getContainer(): Container
	{
		return this.container;
	}

	addToCurrentState(key: string, value: unknown) {
		this.currentStates[key] = value;
	}

	getCurrentState(key: string): any {
		return this.currentStates[key] ?? "";
	}



	public basicInit() {

		this.currentStates = {};

		this.hono.use("*", async (context: Context, next: Next) => {

			 setContext(context);

			this.container = new Container();

	 		this.context = context;

			this.currentStates = {};

			await next();
		});
	}

	public setEnv(env: Record<string, unknown>) {
		setEnv(env);
	}

	public setRequest(request: Request) {
		setRequest(request);
	}

	private applyRoutes(prefix: string | null = null) {
		for (const route of Route.getRoutes()) {
			const { method, path, handler, middlewares } = route;
			let finalPath = path;

			if (prefix) {
				finalPath = `${prefix}/${finalPath}`;
			}

			if (finalPath.length > 1) {
				finalPath = finalPath.replace(/\/+/g, "/").replace(/\/$/, "");
			}

			// Attach middlewares
			// for (let alias of middlewares) {
			// 	let guard: string | null = null;
			// 	if (/sessionAuth|jwtAuth/.test(alias)) {
			// 		let parts = alias.split(":");
			// 		alias = parts[0];
			// 		guard = parts[1] ?? null;
			// 	}
			//
			// 	const middleware = this.config.middlewares.aliases[alias];
			//
			// 	if (!middlewareInstances.has(middleware)) {
			// 		middlewareInstances.set(middleware, new middleware());
			// 	}
			//
			// 	const middlewareInstance = middlewareInstances.get(middleware);
			// 	if (middlewareInstance) {
			// 		if (
			// 			guard &&
			// 			(middlewareInstance instanceof JwtAuth ||
			// 				middlewareInstance instanceof SessionAuth)
			// 		) {
			// 			middlewareInstance.setGuard(guard);
			// 		}
			//
			// 		this.hono.use(
			// 			finalPath,
			// 			middlewareInstance.boot.bind(middlewareInstance),
			// 		);
			// 	}
			// }
			// @ts-ignore

			this.hono[method](finalPath, handler);
		}
	}

	private async initiateHonoRoute() {

		await this.config.app.webRoute();
		

		this.applyRoutes();

		Route.reset();

		await this.config.app.apiRoute();

		this.applyRoutes(this.apiPrefix);
	}

	private activePoweredByMiddleware() {
		this.hono.use(async (context: Context, next: Next) => {
			await next();
			context.res.headers.set(
				"X-Powered-By",
				"FlyingWorker Framework for Cloudflare Worker/Page with Hono, Remix",
			);
		});
	}

	private activeGlobalMiddleware() {
		for (const middleware of this.config.middlewares.global) {
			const middlewareInstance = new middleware();
			this.hono.use(middlewareInstance.boot.bind(middlewareInstance));
		}
	}

	private activeWebMiddleware() {
		for (const middleware of this.config.middlewares.web) {
			const middlewareInstance = new middleware();
			this.hono.use(middlewareInstance.boot.bind(middlewareInstance));
		}
	}

	private activeApiMiddleware() {
		for (const middleware of this.config.middlewares.api) {
			const middlewareInstance = new middleware();
			this.hono.use("api/*", middlewareInstance.boot.bind(middlewareInstance));
		}
	}
}

let App = new Application();

export default App;
