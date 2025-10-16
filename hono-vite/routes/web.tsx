/**
 * Web Routes
 *
 * This file defines web routes for the application.
 * You can change the API prefix in `config/app.ts`.
 */

import { Context } from "hono";
import { App } from "../src/core";
import { Route } from "../src/route";
import { inertiaRender } from "../src/inertia";

App.hono.get('/', c => inertiaRender('Home', { name: 'World' }))
App.hono.get('/about', c => inertiaRender('About', { team: 'Hono + Inertia on Workers' }))

Route.get("/product", async (context: Context) => {
	return context.json({
		data: "Hello",
	});
});
