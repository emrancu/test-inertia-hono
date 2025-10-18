import { sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import { sign } from "hono/jwt";
import { Cookie, parseLifetime } from "../cookie";
import { App, Request } from "../core";
import { DB } from "../database";
import { JWTPayload } from "../type-declaration";

import {
	ApiTokenPayload,
	AuthenticatedUser,
	JwtGuardConfig,
	RolePermission,
} from "../type-declaration";

import { JwtGuardConfigSchema, JwtTokenPayloadSchema } from "../zod-schema";


export  class JwtAuthManager {

	public async createToken(payload: ApiTokenPayload): Promise<string | null> {

		JwtTokenPayloadSchema.parse(payload);

		const now = (Date.now() / 1e3) | 0; // Current Unix timestamp in seconds

		let currentGuard = payload?.guard ?? App.config.auth.defaultApiGuard;

		const currentGuardData = this.getCurrentGuardData(currentGuard);

		let maxAge = payload.maxAge ?? currentGuardData.useCookie.maxAge;

		let maxAgeInSeconds = typeof maxAge === "string" ? parseLifetime(maxAge) : maxAge;

		const expiresAtInSeconds = now + maxAgeInSeconds;

		if (currentGuardData.userTable) {
		
			// Use sql.raw() ONLY for table name, keep user ID parameterized for security
			const userTable = currentGuardData.userTable;
			const userId = payload.user.id;
			
			const statement = sql`SELECT * FROM ${sql.raw(userTable)} WHERE id = ${userId}`;
		 
			const userFromDatabase: { [key: string]: any } | undefined = await DB().get(statement);

		
			if (!userFromDatabase?.id) {
				throw new Error("User not found");
			}
		}



		const finalPayload: JWTPayload = {
			...payload,
			exp: expiresAtInSeconds,
			guard: currentGuard,
		};

//				return finalPayload
		const token = await sign(finalPayload, App.config.app.secret);

		const tokenTable = currentGuardData.tokenTable;

		if (tokenTable) {

			const permissions = JSON.stringify(payload.permissions ?? [])

			const statement = sql`
				  INSERT INTO ${tokenTable} (user_id, name, token, permissions, expires_at)
				  VALUES (
					'${payload.user.id}',
					'${payload?.name}',
					'${token}',
					'${ permissions }',
					'${ expiresAtInSeconds }'
				  )
				`;


			await DB().run(statement);
		}

		if (currentGuardData.useCookie.status) {
			Cookie.set(currentGuardData.useCookie.key, token, maxAge);
		}

		return token;
	}

	public async delete(deleteAll = false) {
		const payload: ApiTokenPayload | null =
			Request.getContext().get("jwtPayload");

		if (!payload) {
			return;
		}

		const currentGuardData = this.getCurrentGuardData();

		const finalGuard = payload?.guard ?? "api";

		const token = await this.getToken(finalGuard);
		if (token) {
			const tokenTable = currentGuardData.tokenTable;

			if (tokenTable && !deleteAll) {
				const statement = sql`DELETE FROM ${tokenTable} WHERE token = ${token}`;

				await DB().run(statement);
			}

			if (tokenTable && deleteAll) {
				const statement = sql`SELECT * FROM ${tokenTable} WHERE token = ${token}`;

				const tokenData = await DB().get(statement);

				if (tokenData) {
					const statement = sql`DELETE FROM ${tokenTable} WHERE user_id = ${tokenData.user_id}`;

					await DB().run(statement);
				}
			}

			if (currentGuardData.useCookie.status) {
				Cookie.delete(currentGuardData.useCookie.key);
			}
		}
	}

	public check(): boolean {
		return !!Request.getContext().get("jwtPayload");
	}

	public async user(guard?: string): Promise<AuthenticatedUser | null> {

		let currentGuard = guard ?? App.config.auth.defaultApiGuard;

		const payload: ApiTokenPayload | null = Request.getContext().get("jwtPayload");

		if(!payload?.guard){
			return null;
		}

		if(payload?.guard !== currentGuard){
			return null;
		}

	    JwtGuardConfigSchema.parse(App.config.auth.guards[currentGuard]);

		const currentGuardData = App.config.auth.guards[currentGuard] as JwtGuardConfig;

		await this.setUser(payload, currentGuardData, currentGuard);

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser");
		}

		if (!App.getCurrentState("authUser")) {
			const payload: ApiTokenPayload | null =
				Request.getContext().get("jwtPayload");

			if (!payload) {
				return null;
			}

			await this.setUser(payload, currentGuardData, currentGuard);
		}

		return App.getCurrentState("authUser"+"_" + currentGuardData);
	}

	private async getToken(guard?: string) {
		const credentials =
			Request.getContext().req.raw.headers.get("Authorization");

		if (credentials) {
			const parts = credentials.split(/\s+/);
			const token = parts[1] || null;

			if (token) {
				return token;
			}
		}

		const data = App.config.auth.guards[guard ?? "api"] as JwtGuardConfig;

		const token = await Cookie.get(data.useCookie.key);

		if (token) {
			return token;
		}

		return null;
	}

	private getCurrentGuardData(guard?: string): JwtGuardConfig {
		const payload: ApiTokenPayload | null = Request.getContext().get("jwtPayload");

		const finalGuard = payload?.guard ?? guard ?? "api";

		if (finalGuard) {
			return App.config.auth.guards[finalGuard] as JwtGuardConfig;
		}

		throw new Error("Guard is invalid");
	}

	private async formatUserData(
		data: ApiTokenPayload,
		guardData: JwtGuardConfig,
	): Promise<AuthenticatedUser> {

		const RolePermissionTable = guardData?.rolePermissionTable;

		let rolePermissionData: RolePermission[] = [];

		if (RolePermissionTable) {

			const statement = sql`SELECT * FROM ${RolePermissionTable} WHERE user_id = ${data.user.id}`;

			const rolePermissions: { [x: string]: string }[] =
				await DB().all(statement);

			if (rolePermissions.length > 0) {
				for (const item of rolePermissions) {
					rolePermissionData.push({
						id: Number.parseInt(item.id),
						role: item.role,
						permissions: item.permissions ? JSON.parse(item.permissions) : [],
					});
				}
			}
		} else {
			if (data.user.rolePermissions) {
				rolePermissionData = data.user.rolePermissions;
			}
		}

		return {
			...data.user,
			tokenPermissions: data.permissions,
			rolePermissions: rolePermissionData,
			hasRole: this.hasRole,
			hasPermission: this.hasPermission,
			hasTokenPermission: this.hasTokenPermission,
		};
	}

	private hasRole(role: string | [string]): boolean {
		const roles = Array.isArray(role) ? role : [role];

		if (App.getCurrentState("authUser")?.rolePermissions) {
			return App.getCurrentState("authUser").rolePermissions.some((item: any) =>
				roles.includes(item.role),
			);
		}

		return false;
	}

	private hasPermission(permission: string | [string]): boolean {
		const permissions = Array.isArray(permission) ? permission : [permission];

		if (App.getCurrentState("authUser")?.rolePermissions) {
			return App.getCurrentState("authUser")?.rolePermissions.some(
				(item: any) =>
					permissions.every((perm) => item.permissions.includes(perm)),
			);
		}

		return false;
	}

	private hasTokenPermission(permission: string | [string]): boolean {
		const permissions = Array.isArray(permission) ? permission : [permission];

		const authUser = App.getCurrentState("authUser");

		if (!authUser || !Array.isArray(authUser?.tokenPermissions)) {
			return false;
		}

		return permissions.every((p) => authUser.tokenPermissions.includes(p));
	}

	private async setUser(
		data: ApiTokenPayload,
		guardData: JwtGuardConfig,
		currentGuard?: string,
	) {
		const userTable = guardData.userTable;

		if (userTable) {
			const statement = sql`SELECT * FROM ${userTable} WHERE id = ${data.user.id}`;

			const userFromDatabase: { [key: string]: any } | undefined =
				await DB().get(statement);

			if (!userFromDatabase) {
				throw new HTTPException(401, {
					message: "User not found",
				});
			}

			if (userFromDatabase.password) {
				userFromDatabase.password = undefined;
			}

			if (userFromDatabase.remember_token) {
				userFromDatabase.remember_token = undefined;
			}

			data.user = {
				id: userFromDatabase.id,
				name: userFromDatabase.name,
				email: userFromDatabase.email,
				...userFromDatabase,
			};
		}

		if (guardData.tokenTable) {
			const AuthToken = await this.getToken(currentGuard ?? "api");

			const statement = sql`SELECT * FROM ${guardData.tokenTable} WHERE token = ${AuthToken}`

			const token = await DB().get(statement);

			if (!token) {
				throw new HTTPException(401, {
					message: "Invalid Token",
				});
			}
		}

		const userData = await this.formatUserData(data, guardData);

		App.addToCurrentState("authUser", userData);
	}

}


export const resolveJwtAuth = (): JwtAuthManager => {
	return  App.getContainer().resolve('JwtAuth', ()=>{
		return new JwtAuthManager();
	})
};