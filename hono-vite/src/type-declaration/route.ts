import { Context } from "hono";

export type HandlerFunction = (c: Context) => Response | Promise<Response>;

// Define the RouteHandler type
type RouteHandler<T> = [T, keyof T];

// Create a union type that can be either a HandlerFunction or a RouteHandler
export type RouteHandlerFunction<T> = HandlerFunction | RouteHandler<T>;

export type HttpMethod =
	| "get"
	| "post"
	| "put"
	| "delete"
	| "patch"
	| "options"
	| "head"
	| "all";

type DefineRouteOptions = {
	/**
	 * Should be `true` if the route `path` is case-sensitive. Defaults to
	 * `false`.
	 */
	caseSensitive?: boolean;
	/**
	 * Should be `true` if this is an index route that does not allow child routes.
	 */
	index?: boolean;
	/**
	 * An optional unique id string for this route. Use this if you need to aggregate
	 * two or more routes with the same route file.
	 */
	id?: string;
};

type DefineRouteChildren = () => void;

export type DefineRouteFunction = (
	/**
	 * The path this route uses to match the URL pathname.
	 */
	path: string | undefined,
	/**
	 * The path to the file that exports the React component rendered by this
	 * route as its default export, relative to the `app` directory.
	 */
	file: string,
	/**
	 * Options for defining routes, or a function for defining child routes.
	 */
	optionsOrChildren?: DefineRouteOptions | DefineRouteChildren,
	/**
	 * A function for defining child routes.
	 */
	children?: DefineRouteChildren,
) => void;
