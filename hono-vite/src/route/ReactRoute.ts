import type { DefineRouteFunction } from "../type-declaration";

type RouteDefinition = {
	path: string;
	file: string;
	middlewares: Array<string>;
};

const routes: Map<string, RouteDefinition> = new Map();
const parentPaths: string[] = [];
const parentMiddlewares: Array<Array<any>> = [];

const convertPath = (path: string): string => {
	return path.replace(/^(\.?\/)?resources\/react\//, "");
};

const buildFullPath = (path: string): string => {
	const normalized = path.startsWith("/") ? path : `/${path}`;
	if (parentPaths.length === 0) {
		return normalized;
	}

	const fullPath = `${parentPaths.join("")}${normalized}`;
	return fullPath.replace(/\/+/g, "/");
};

const normalizePath = (path: string): string => {
	if (!path) return "";
	return `/${path.replace(/^\/+|\/+$/g, "")}`;
};

const isParameterMatch = (routePath: string, requestPath: string): boolean => {
	const routeSegments = normalizePath(routePath).split("/").filter(Boolean);
	const requestSegments = requestPath.split("/").filter(Boolean);

	if (requestSegments.length !== routeSegments.length) return false;

	return routeSegments.every((segment, index) => {
		if (segment.startsWith(":")) return true;
		return segment === requestSegments[index];
	});
};

const ReactRoutes = (
	path: string,
	fileOrCallback: string | (() => void),
	middlewares: Array<any> = [],
) => {
	const currentPath = buildFullPath(path);
	const currentMiddlewares = [...parentMiddlewares.flat(), ...middlewares];

	if (typeof fileOrCallback === "string") {
		if (currentPath && routes.has(currentPath)) {
			const existingRoute: any = routes.get(currentPath);

			if (existingRoute) {
				const mergedMiddlewares = [
					...new Set([...existingRoute.middlewares, ...currentMiddlewares]),
				];

				routes.set(currentPath, {
					path: currentPath,
					file: convertPath(fileOrCallback),
					middlewares: mergedMiddlewares,
				});
			}
		} else {
			routes.set(currentPath, {
				path: currentPath,
				file: convertPath(fileOrCallback),
				middlewares: currentMiddlewares,
			});
		}
	} else {
		parentPaths.push(currentPath);
		parentMiddlewares.push(...middlewares);

		fileOrCallback();
		parentMiddlewares.pop();
		parentPaths.pop();
	}
};

const getRoutes = (): RouteDefinition[] => {
	return Array.from(routes.values()).map((route) => ({
		...route,
		path: route.path.length > 1 ? route.path.replace(/\/$/, "") : route.path,
	}));
};

const matchMiddlewares = (requestPath: string): string[] => {
	const normalizedPath = normalizePath(requestPath);

	return Array.from(routes.values())
		.filter((route) => {
			return (
				route.middlewares.length > 0 &&
				(normalizePath(route.path) === normalizedPath ||
					isParameterMatch(route.path, normalizedPath))
			);
		})
		.flatMap((route) => route.middlewares);
};

// Export only the requested functions
export const ReactRoute = ReactRoutes;

export const GetReactRoutes = getRoutes;
export const ReactMiddlewareByPath = matchMiddlewares;

export const applyReactRoutes = async (route: DefineRouteFunction) => {
	try {
		const routes = GetReactRoutes();

		for (const singleRoute of routes) {
			route(singleRoute.path, singleRoute.file);
		}
	} catch (error: any) {
		throw new Error(`Error loading route: ${error.message}`);
	}
};
