import { Context, Next } from "hono";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";

export type MiddlewareInstance = {
	boot: (c: Context, next: Next) => Promise<Response | void | undefined>;
};

export type MiddlewareClass = new () => BaseMiddleware;
