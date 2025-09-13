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

  import {Cookie} from "../src/cookie";
  

App.hono.get('/', async (c) => {
	Cookie.set("test", "test"); 

	return   c.json({home: await Cookie.get("test")})
    // return   c.render(<h1>Hello ss!</h1>)
})

App.hono.get("test-001", async (context: Context) => {
	return context.json({
		data: "Hello",
	});
});



// Route.get("/web", async (context: Context) => {
//
// 	return context.json({
// 		auth: await ApiAuth.createToken({
// 			name: 'AL EMRAN',
// 			user: {
// 				id: 1,
// 				name: 'Emran',
// 				email: "emrancu1@gmail.com"
// 			},
// 		})
// 	});
// 	// return SocialAuth.github().redirect();
// });
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
