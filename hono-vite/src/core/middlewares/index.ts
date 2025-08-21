import { Context, Next } from "hono";
import { App } from "../index";

export const Index = async (context: Context, next: Next) => {
	return context.html(App.config.app.maintenance.message);
};
