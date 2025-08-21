import { HandlerFunction, HttpMethod } from "../type-declaration";

type RouteHandler<T> = [T, keyof T];

class RouteManager {
	private routes: {
		method: HttpMethod;
		path: string;
		handler: HandlerFunction;
		middlewares: string[];
	}[] = [];
	private groupPrefix = ""; // Prefix for route groups
	private groupMiddlewares: string[] = []; // Middlewares applied to a group

	private add(
		method: HttpMethod,
		path: string,
		handler: HandlerFunction | RouteHandler<any>,
		middlewares: string[] = [],
	) {
		let fn: HandlerFunction;

		if (Array.isArray(handler)) {
			const [ClassRef, methodName] = handler;
			const instance = new ClassRef();
			fn = instance[methodName].bind(instance);
		} else {
			fn = handler;
		}

		// Merge group prefix and middlewares
		const finalPath = this.groupPrefix + path;
		const finalMiddlewares = [...this.groupMiddlewares, ...middlewares];

		this.routes.push({
			method,
			path: finalPath,
			handler: fn,
			middlewares: finalMiddlewares,
		});
	}

	public group(
		prefix: string,
		callback: () => void,
		middlewares: string[] = [],
	) {
		const prevPrefix = this.groupPrefix;
		const prevMiddlewares = this.groupMiddlewares;

		this.groupPrefix = prevPrefix + prefix;
		this.groupMiddlewares = [...prevMiddlewares, ...middlewares];

		callback();

		this.groupPrefix = prevPrefix;
		this.groupMiddlewares = prevMiddlewares;
	}

	public getRoutes() {
		return this.routes;
	}

	public get(
		path: string,
		handler: HandlerFunction | [any, string],
		middlewares: string[] = [],
	) {
		this.add("get", path, handler, middlewares);
	}

	public post(
		path: string,
		handler: HandlerFunction | [any, string],
		middlewares: string[] = [],
	) {
		this.add("post", path, handler, middlewares);
	}

	public put(
		path: string,
		handler: HandlerFunction | [any, string],
		middlewares: string[] = [],
	) {
		this.add("put", path, handler, middlewares);
	}

	public delete(
		path: string,
		handler: HandlerFunction | [any, string],
		middlewares: string[] = [],
	) {
		this.add("delete", path, handler, middlewares);
	}

	public reset() {
		this.routes = [];
	}

	public all(
		path: string,
		handler: HandlerFunction | [any, string],
		middlewares: string[] = [],
	) {
		this.add("all", path, handler, middlewares);
	}
}

let Route: RouteManager = new RouteManager();

export default Route;
