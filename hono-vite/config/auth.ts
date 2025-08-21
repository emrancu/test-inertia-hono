import { type AuthConfig } from "../src/type-declaration";


// WebAuth.user()
// WebAuth.guard('').user()
// WebAuth.user('guard')
// WebAuth.guard('guard').login(...)
// WebAuth.check()
// WebAuth.guard().check()



// ApiAuth.user()
// ApiAuth.guard('').user()
// ApiAuth.user('guard')
// ApiAuth.attempt()



export const authConfig: AuthConfig = {

	defaultWebGuard: "web",

	defaultApiGuard: "pro",

	guards: {
		web: {
			driver: "session",
			userTable: "users",
			rolePermissionTable: "role_permissions",
		},
		api: {
			driver: "jwt",
			useCookie: {
				status: true,
				maxAge: "2d", // number as second and 1s, 2m,3h, 4d
				key: "authorization-token",
			},
			userTable: 'users',
			rolePermissionTable: "role_permissions",
			tokenTable: "user_access_token",
		},
		pro: {
			driver: "jwt",
			useCookie: {
				status: true,
				maxAge: "2d", // number as second and 1s, 2m,3h, 4d
				key: "authorization-token",
			},
			userTable: "users",
			rolePermissionTable: "role_permissions",
			tokenTable: "user_access_token",
		},
	},
};
