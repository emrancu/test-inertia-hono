import { sql } from "drizzle-orm";
import { sign, verify } from "hono/jwt";
import { HTTPException } from "hono/http-exception";
import { App, AppRequest } from "../core";
import { Cookie, parseLifetime } from "../cookie";
import { DB } from "../database";
import { Session } from "../session";
import { Str } from "../supports";
import { passwordVerify } from "../supports";
import {
	AuthUser,
	AuthenticatedUser,
	RolePermission,
	SessionGuardConfig,
	JwtGuardConfig,
	JWTPayload,
	ApiTokenPayload,
} from "../type-declaration";
import { AuthUserSchema, JwtGuardConfigSchema } from "../zod-schema";


type AuthData = {
	guard: string;
	userId: number;
};

type LoginOptions = {
	remember?: boolean;
	maxAge?: string | number;
	tokenName?: string;
	permissions?: string[];
};

export class AuthManager {
	private guardsName: string | null = null;

	/**
	 * Set the guard to use for authentication
	 */
	public guard(guard: string): this {
		this.guardsName = guard;
		return this;
	}

	/**
	 * Get current guard name or default
	 */
	private getCurrentGuard(): string {
		if (this.guardsName) {
			return this.guardsName;
		}
		
		// Try to detect if this is an API request or Web request
		try {
			const path = AppRequest.getContext()?.req?.path || "";
			const isApiRequest = path.startsWith("/api");
			
			return isApiRequest 
				? App.config.auth.defaultApiGuard 
				: App.config.auth.defaultWebGuard;
		} catch (error) {

			return App.config.auth.defaultWebGuard;
		}
	}

	/**
	 * Get guard configuration
	 */
	private getGuardConfig(guardName?: string): SessionGuardConfig | JwtGuardConfig {
		const guard = guardName || this.getCurrentGuard();
		const guardConfig = App.config.auth.guards[guard];
		
		if (!guardConfig) {
			throw new Error(`Guard "${guard}" not found in configuration`);
		}
		
		return guardConfig;
	}

	/**
	 * Check if guard is session-based
	 */
	private isSessionGuard(guardName?: string): boolean {
		const config = this.getGuardConfig(guardName);
		return config.driver === "session";
	}

	/**
	 * Check if guard is JWT-based
	 */
	private isJwtGuard(guardName?: string): boolean {
		const config = this.getGuardConfig(guardName);
		return config.driver === "jwt";
	}

	/**
	 * Login user (works with both session and JWT guards)
	 */
	public async login(user: AuthUser, options: LoginOptions = {}): Promise<string | void> {
		AuthUserSchema.parse(user);

		const guard = this.getCurrentGuard();
		
		if (this.isSessionGuard(guard)) {
			return await this.sessionLogin(user, options.remember || false);
		} else if (this.isJwtGuard(guard)) {
			return await this.jwtLogin(user, options);
		}
		
		throw new Error(`Unknown driver for guard "${guard}"`);
	}

	/**
	 * Session-based login
	 */
	private async sessionLogin(user: AuthUser, remember = false): Promise<void> {
		await this.regenerateSession();

		const guard = this.getCurrentGuard();
		const key = this.sessionKey();
		
		Session.put(key, { guard, userId: user.id });

		if (remember) {
			Cookie.set("remember_login", user.id.toString(), "30d");
		}

		App.addToCurrentState("authUser", await this.formatUserData(user, guard));
	}

	/**
	 * JWT-based login
	 */
	private async jwtLogin(user: AuthUser, options: LoginOptions = {}): Promise<string> {
		const guard = this.getCurrentGuard();
		const guardConfig = this.getGuardConfig(guard) as JwtGuardConfig;

		// Verify user exists in database
		if (guardConfig.userTable) {
			const statement = sql`SELECT * FROM ${sql.raw(guardConfig.userTable)} WHERE id = ${user.id}`;
			const userFromDatabase: { [key: string]: any } | undefined = await DB().get(statement);

			if (!userFromDatabase?.id) {
				throw new Error("User not found");
			}
		}

		const now = (Date.now() / 1e3) | 0;
		const maxAge = options.maxAge ?? guardConfig.useCookie.maxAge;
		const maxAgeInSeconds = typeof maxAge === "string" ? parseLifetime(maxAge) : maxAge;
		const expiresAtInSeconds = now + maxAgeInSeconds;

		const payload: JWTPayload = {
			user: {
				id: user.id,
				name: user.name,
				email: user.email,
			},
			guard,
			exp: expiresAtInSeconds,
			permissions: options.permissions || [],
		};

		const token = await sign(payload, App.config.app.secret);

		// Store token in database if tokenTable is configured
		if (guardConfig.tokenTable) {
			const permissions = JSON.stringify(options.permissions ?? []);
			const tokenName = options.tokenName ?? "auth_token";

			const statement = sql`
				INSERT INTO ${sql.raw(guardConfig.tokenTable)} (user_id, name, token, permissions, expires_at)
				VALUES (
					${user.id},
					${tokenName},
					${token},
					${permissions},
					${expiresAtInSeconds}
				)
			`;

			await DB().run(statement);
		}

		// Set cookie if configured
		if (guardConfig.useCookie.status) {
			Cookie.set(guardConfig.useCookie.key, token, maxAge);
		}

		App.addToCurrentState("authUser", await this.formatUserData(user, guard));

		return token;
	}

	/**
	 * Attempt to authenticate with credentials
	 */
	public async attempt(
		credentials: { [key: string]: string },
		options: LoginOptions = {},
	): Promise<boolean | string> {
		const guard = this.getCurrentGuard();
		const guardConfig = this.getGuardConfig(guard);

		if (!guardConfig.userTable) {
			throw new Error("User table not configured for this guard");
		}

		let conditions: string[] = [];
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

		const whereClause = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";
		const statement = sql`select * from ${sql.raw(guardConfig.userTable)} ${sql.raw(whereClause)}`;

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
			const result = await this.login(
				{
					id: user.id,
					name: user.name,
					email: user.email,
					...user,
				},
				options,
			);

			// For JWT guards, return the token; for session guards, return true
			return this.isJwtGuard(guard) ? (result as string) : true;
		} catch (error: unknown) {
			return false;
		}
	}

	/**
	 * Logout user (works with both session and JWT guards)
	 */
	public async logout(deleteAllTokens = false): Promise<void> {
		const guard = this.getCurrentGuard();

		if (this.isSessionGuard(guard)) {
			await this.sessionLogout();
		} else if (this.isJwtGuard(guard)) {
			await this.jwtLogout(deleteAllTokens);
		}
	}

	/**
	 * Session-based logout
	 */
	private async sessionLogout(): Promise<void> {
		await this.regenerateSession();
		Cookie.delete("remember_login");
		App.addToCurrentState("authUser", null);
	}

	/**
	 * JWT-based logout
	 */
	private async jwtLogout(deleteAll = false): Promise<void> {
		const guard = this.getCurrentGuard();
		const guardConfig = this.getGuardConfig(guard) as JwtGuardConfig;
		const token = await this.getJwtToken(guard);

		if (token && guardConfig.tokenTable) {
			if (!deleteAll) {
				const statement = sql`DELETE FROM ${sql.raw(guardConfig.tokenTable)} WHERE token = ${token}`;
				await DB().run(statement);
			} else {
				// Delete all tokens for this user
				const statement = sql`SELECT * FROM ${sql.raw(guardConfig.tokenTable)} WHERE token = ${token}`;
				const tokenData = await DB().get(statement);

				if (tokenData) {
					const deleteStatement = sql`DELETE FROM ${sql.raw(guardConfig.tokenTable)} WHERE user_id = ${tokenData.user_id}`;
					await DB().run(deleteStatement);
				}
			}
		}

		if (guardConfig.useCookie.status) {
			Cookie.delete(guardConfig.useCookie.key);
		}

		App.addToCurrentState("authUser", null);
	}

	/**
	 * Check if user is authenticated
	 */
	public check(): boolean {
		const guard = this.getCurrentGuard();

		if (this.isSessionGuard(guard)) {
			return this.sessionCheck();
		} else if (this.isJwtGuard(guard)) {
			return this.jwtCheck();
		}

		return false;
	}

	/**
	 * Session-based check
	 */
	private sessionCheck(): boolean {
		const guard = this.getCurrentGuard();
		const key = this.sessionKey();
		const authData: AuthData | null = Session.get(key);

		return !!(authData && authData.guard === guard);
	}

	/**
	 * JWT-based check
	 */
	private jwtCheck(): boolean {
		try {
			const payload = AppRequest.getContext().get("jwtPayload");
			return !!payload;
		} catch (error) {
			return false;
		}
	}

	/**
	 * Get authenticated user
	 */
	public async user(): Promise<AuthenticatedUser | null> {
		const guard = this.getCurrentGuard();

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser");
		}

		if (this.isSessionGuard(guard)) {
			return await this.sessionUser();
		} else if (this.isJwtGuard(guard)) {
			return await this.jwtUser();
		}

		return null;
	}

	/**
	 * Session-based user retrieval
	 */
	private async sessionUser(): Promise<AuthenticatedUser | null> {
		const key = this.sessionKey();
		const authData: AuthData | null = Session.get(key);

		if (!authData) {
			return null;
		}

		await this.setSessionUser(authData);
		return App.getCurrentState("authUser");
	}

	/**
	 * JWT-based user retrieval
	 */
	private async jwtUser(): Promise<AuthenticatedUser | null> {
		const guard = this.getCurrentGuard();
		
		try {
			const payload: ApiTokenPayload | null = AppRequest.getContext().get("jwtPayload");

			if (!payload?.guard) {
				return null;
			}

			if (payload.guard !== guard) {
				return null;
			}

			const guardConfig = this.getGuardConfig(guard) as JwtGuardConfig;
			await this.setJwtUser(payload, guardConfig, guard);

			return App.getCurrentState("authUser");
		} catch (error) {
			return null;
		}
	}

	/**
	 * Get JWT token from request
	 */
	private async getJwtToken(guard: string): Promise<string | null> {
		try {
			const credentials = AppRequest.getContext().req.raw.headers.get("Authorization");

			if (credentials) {
				const parts = credentials.split(/\s+/);
				const token = parts[1] || null;
				if (token) return token;
			}
		} catch (error) {
			// Context not available, try cookie
		}

		const guardConfig = this.getGuardConfig(guard) as JwtGuardConfig;
		const token = await Cookie.get(guardConfig.useCookie.key);

		return token || null;
	}

	/**
	 * Session key generator
	 */
	private sessionKey(): string {
		return Str.snake(`${App.config.app.name} web-auth-user-id`);
	}

	/**
	 * Regenerate session
	 */
	private async regenerateSession(): Promise<void> {
		if (Session.getId()) {
			Session.regenerate();
		}
	}

	/**
	 * Format user data with roles and permissions
	 */
	private async formatUserData(
		user: AuthUser,
		guard: string,
		isJwt = false,
		tokenPermissions?: string[],
	): Promise<AuthenticatedUser> {
		const guardConfig = this.getGuardConfig(guard);
		const rolePermissionTable = guardConfig.rolePermissionTable;

		let rolePermissions: RolePermission[] = [];

		if (!user?.rolePermissions && rolePermissionTable) {
			const statement = sql`SELECT * FROM ${sql.raw(rolePermissionTable)} WHERE user_id = ${user.id}`;
			const rolePermissionsFromDb: { [x: string]: any }[] = await DB().all(statement);

			if (rolePermissionsFromDb) {
				for (const item of rolePermissionsFromDb) {
					rolePermissions.push({
						id: Number(item.id),
						role: item.role,
						permissions:
							item.permissions && typeof item.permissions === "string"
								? JSON.parse(item.permissions)
								: [],
					});
				}
			}
		} else if (user?.rolePermissions) {
			rolePermissions = user.rolePermissions;
		}

		// Remove sensitive data
		if (user.password) {
			user.password = undefined;
		}

		const formattedUser: AuthenticatedUser = {
			...user,
			rolePermissions,
			hasRole: this.hasRole,
			hasPermission: this.hasPermission,
		};

		// Add JWT-specific methods and data
		if (isJwt) {
			formattedUser.tokenPermissions = tokenPermissions || [];
			formattedUser.hasTokenPermission = this.hasTokenPermission;
		}

		return formattedUser;
	}

	/**
	 * Check if user has role
	 */
	private hasRole(role: string | string[]): boolean {
		const roles = Array.isArray(role) ? role : [role];

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser").rolePermissions.some((item: any) =>
				roles.includes(item.role),
			);
		}

		return false;
	}

	/**
	 * Check if user has permission
	 */
	private hasPermission(permission: string | string[]): boolean {
		const permissions = Array.isArray(permission) ? permission : [permission];

		if (App.getCurrentState("authUser")) {
			return App.getCurrentState("authUser").rolePermissions.some((item: any) =>
				permissions.every((perm) => item.permissions.includes(perm)),
			);
		}

		return false;
	}

	/**
	 * Check if user has token permission (JWT only)
	 */
	private hasTokenPermission(permission: string | string[]): boolean {
		const permissions = Array.isArray(permission) ? permission : [permission];
		const authUser = App.getCurrentState("authUser");

		if (!authUser || !Array.isArray(authUser?.tokenPermissions)) {
			return false;
		}

		return permissions.every((p) => authUser.tokenPermissions.includes(p));
	}

	/**
	 * Set session user in state
	 */
	private async setSessionUser(data: AuthData): Promise<void> {
		const guardConfig = this.getGuardConfig(data.guard);

		if (!guardConfig.userTable) {
			throw new Error("User table not configured");
		}

		const statement = sql`SELECT * FROM ${sql.raw(guardConfig.userTable)} WHERE id = ${data.userId}`;
		const user: { [x: string]: any } | undefined = await DB().get(statement);

		if (user) {
			const userData = await this.formatUserData(
				{
					id: user.id,
					name: user.name,
					email: user.email,
					...user,
				},
				data.guard,
			);
			App.addToCurrentState("authUser", userData);
		}
	}

	/**
	 * Set JWT user in state
	 */
	private async setJwtUser(
		data: ApiTokenPayload,
		guardConfig: JwtGuardConfig,
		currentGuard: string,
	): Promise<void> {
		const userTable = guardConfig.userTable;

		if (userTable) {
			const statement = sql`SELECT * FROM ${sql.raw(userTable)} WHERE id = ${data.user.id}`;
			const userFromDatabase: { [key: string]: any } | undefined = await DB().get(statement);

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

		// Verify token exists in database if tokenTable is configured
		if (guardConfig.tokenTable) {
			const authToken = await this.getJwtToken(currentGuard);
			const statement = sql`SELECT * FROM ${sql.raw(guardConfig.tokenTable)} WHERE token = ${authToken}`;
			const token = await DB().get(statement);

			if (!token) {
				throw new HTTPException(401, {
					message: "Invalid Token",
				});
			}
		}

		const userData = await this.formatUserData(
			data.user,
			currentGuard,
			true,
			data.permissions,
		);

		App.addToCurrentState("authUser", userData);
	}
}

export const resolveAuth = (): AuthManager => {
	return App.getContainer().resolve("Auth", () => {
		return new AuthManager();
	});
};

// Backward compatibility
export const resolveSessionAuth = resolveAuth;

 