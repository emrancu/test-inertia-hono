import { sql } from "drizzle-orm";
import { App, AppRequest } from "../core";
import { Cookie } from "../cookie";
import { DB } from "../database";
import { Session } from "../session";
import { Str } from "../supports";
import { passwordVerify } from "../supports";
import {
	AuthUser,
	AuthenticatedUser,
	RolePermission,
} from "../type-declaration";
import { AuthUserSchema } from "../zod-schema";

type AuthData = {
	guard: string;
	userId: number;
};

export class AuthManager {

	private guardsName: string|null = null;

	public async logout() {
		await this.regenerateSession();
		Cookie.delete("remember_login");
	}

	private async regenerateSession() {
		if (Session.getId()) {
			// Clear existing session data
			 Session.regenerate(); 
		}
	}

	public guard(guard: string){
		this.guardsName = guard

		return this
	}

	public async login(user: AuthUser, remember = false): Promise<void> {

		AuthUserSchema.parse(user);

		await this.regenerateSession();

		if(!this.guardsName){
			this.guardsName = App.config.auth.defaultWebGuard
		}

		// Set new session data
		const key = this.sessionKey();
		Session.put(key, { guard: this.guardsName, userId: user.id });

		App.addToCurrentState("authUser", await this.formatUserData(user));

	}

	public async attempt(
		credentials: { [key: string]: string },

		remember = false,
	): Promise<any> {

		if(!this.guardsName){
			this.guardsName = App.config.auth.defaultWebGuard
		}

		const userTable = App.config.auth.guards[this.guardsName].userTable;

		if (!userTable) {
			throw new Error("Auth table not set in config/app.ts");
		}

		let conditions = [];
		let values = [];
		let password = "";

		for (const [key, value] of Object.entries(credentials)) {
			if (key === "password" || key === "pass") {
				password = value;
				continue;
			}
			if (value !== undefined && value !== null) {
				conditions.push(`${key} = "${value}"`);
			}
		}

		const whereClause =
			conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";
		const statement = sql`select * from ${userTable} ${whereClause}`;

		const user: { [x: string]: any } | undefined = await DB().get(statement);

		if (!user) {
			return false;
		}

		if (password) {
			const verify = await passwordVerify(password, user.password);

			if (!verify) {
				return false;
			}
		}

		try {
			await this.login(
				{
					id: user.id,
					name: user.name,
					email: user.email,
					...user,
				},
				remember,
			);
		} catch (error: unknown) {
			return false;
		}

		return true;
	}

	public check(guard?: string): boolean {

		if(!this.guardsName){
			this.guardsName = guard ?? App.config.auth.defaultWebGuard;
		}

		const key = this.sessionKey();

		const authData: AuthData | null = Session.get(key);

		return !!(authData && authData.guard === this.guardsName);
	}

	public async user(): Promise<AuthenticatedUser | null> {
		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser");
		}

		const key = this.sessionKey();
		const authData: AuthData = Session.get(key);

		if (!authData) {
			return null;
		}

		if (!App.getCurrentState("authUser")) {
			await this.setUser(authData);
		}

		return App.getCurrentState("authUser");
	}

	private sessionKey(): string {
		return Str.snake(`${App.config.app.name} web-auth-user-id`);
	}

	private async formatUserData(user: AuthUser): Promise<AuthenticatedUser> {
		const RolePermissionTable = App.config.auth.guards.web?.rolePermissionTable;

		let rolePermissions: [RolePermission] | [] = [];

		if (!user?.rolePermissions && RolePermissionTable) {
			const statement = sql`select * from ${RolePermissionTable} where user_id = ${user.id}`;

			const rolePermissionsFromDb: { [x: string]: number | string }[] =
				await DB().all(statement);

			if (rolePermissionsFromDb) {
				for (const item of rolePermissionsFromDb) {
					// @ts-ignore
					rolePermissions.push({
						id: item.id,
						role: item.role,
						permissions:
							item.permissions && typeof item.permissions === "string"
								? JSON.parse(item.permissions)
								: [],
					});
				}
			}
		}

		if (user.password) {
			user.password = undefined;
		}

		return {
			...user,
			rolePermissions: rolePermissions,
			hasRole: this.hasRole,
			hasPermission: this.hasPermission,
		};
	}

	private hasRole(role: string | [string]): boolean {
		const roles = Array.isArray(role) ? role : [role];

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser").rolePermissions.some((item: any) =>
				roles.includes(item.role),
			);
		}

		return false;
	}

	private hasPermission(permission: string | [string]): boolean {
		const permissions = Array.isArray(permission) ? permission : [permission];

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser").rolePermissions.some((item: any) =>
				permissions.every((perm) => item.permissions.includes(perm)),
			);
		}

		return false;
	}

	private async setUser(data: AuthData) {
		const userTable = App.config.auth.guards[data.guard].userTable;

		const statement = sql`select * from ${userTable} where id =  ${data.userId}`;

		const user: { [x: string]: any } | undefined = await DB().get(statement);

		if (user) {
			const userData = await this.formatUserData({
				id: user.id,
				name: user.name,
				email: user.email,
				...user,
			});
			App.addToCurrentState("authUser", userData);
		}
	}
}

export const resolveSessionAuth = (): AuthManager => {
	return  App.getContainer().resolve('SessionAuth', ()=>{
		return new AuthManager();
	})
};