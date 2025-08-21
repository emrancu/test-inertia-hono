export type UserModel<T extends { id: number; name: string; email: string }> =
	T;

type User = {
	id: number;
	name: string;
	email: string;
	password: string;
	provider: string | null;
	provider_id: string | null;
	avatar: string | null;
	remember_token: string | null;
	created_at: string;
	updated_at: string | null;
};

export type RolePermission = {
	id: number;
	role: string;
	permissions: string[];
	[key: string]: unknown;
};

export type AuthUser = {
	id: number;
	name: string;
	email: string;
	rolePermissions?: [RolePermission] | [];
	[key: string]: unknown;
};

export type AuthenticatedUser = {
	id: number;
	name: string;
	email: string;
	hasRole: (role: string | [string]) => boolean;
	hasPermission: (permission: string | [string]) => boolean;
	hasTokenPermission?: (permission: string | [string]) => boolean;
	rolePermissions?: RolePermission[] | [];
	[key: string]: unknown;
};

export type TokenData = {
	name?: string;
	abilities?: [string];
	maxAge?: number | string;
};

export type ApiTokenPayload = {
	name?: string;
	user: AuthUser;
	guard?: string;
	permissions?: [string];
	maxAge?: number | string;
	[key: string]: unknown;
};

export type JwtTokenPayload = {
	user: AuthUser;
	abilities?: [string];
	exp?: number;
};
