/**
 * API Routes
 *
 * This file defines the Hono API routes for the application.
 *
 * You can change the prefix for these routes in `bootstrap/App.tsx`.
 * For example, if the prefix is set to `/api`, these routes will be accessible as:
 * - GET `/api/` -> Calls the `apiIndex` function
 * - GET `/api/set-session` -> Calls the `SessionSet` function
 */

import { Context } from "hono";
// import { UserController } from "../controllers/UserController";
// import { SocialAuth } from "../src/auth";
import { App } from "../src/core";
import { Route } from "../src/route";
import { AppRequest } from "../src/core/request";
import {Session} from "../src/session";

import { inertiaRender } from "../src/inertia";
// import { inertiaMiddleware, serveAssets, inertiaRedirect } from "../inertia/worker";

// Apply inertia middleware to the app
// App.hono.use('*', inertiaMiddleware());

// Serve static assets
// App.hono.get('/assets/*', serveAssets);

App.hono.get('/', c => inertiaRender(c, 'Home', { name: 'World' }))
App.hono.get('/about', c => inertiaRender(c, 'About', { team: 'Hono + Inertia on Workers' }))

// Test route to verify inertia is working
// App.hono.post('/test-inertia', c => {
//   // This would typically redirect after a form submission
//   return inertiaRedirect(c, '/about')
// })

// App.hono.get('/', async (c) => {
// 	 Session.put("test", "test sdsd"); 

// 	return   c.json({home: await Session.get("test")})
//     // return   c.render(<h1>Hello ss!</h1>)
// })

// App.hono.get("test-001", async (context: Context) => {
// 	return context.json({
// 		data: "Hello",
// 	});
// });



 Route.get("/product", async (context: Context) => {

	return context.json({
		data: "Hello",
	});
	 
});


//
// Route.get("/web/callback", async (context: Context) => {
// 	return context.json({
// 		dd: await SocialAuth.github().getUser(),
// 		d: "oko",
// 	});
// });
//
//
// Route.get("/test", [UserController, "testWeb"]);
//
// Route.get("/test/user", [UserController, "user"]);
