import { z } from "zod";

// Zod schema for UseCookie type
const UseCookieSchema = z.object({
	status: z.boolean(),
	maxAge: z.union([z.string(), z.number()]),
	key: z.string(),
});

// Zod schema for UserModelConstraint type
const UserModelConstraintSchema = z.object({
	id: z.any(),
	email: z.any(),
	provider_name: z.any(),
	provider_id: z.any(),
	avatar: z.any(),
	remember_token: z.any(),
});

// Zod schema for RolePermissionModelConstraint type
const RolePermissionModelConstraintSchema = z.object({
	id: z.any(),
	user_id: z.any(),
	role: z.any(),
	permissions: z.any(),
});

// Zod schema for TokenModelConstraint type
const TokenModelConstraintSchema = z.object({
	id: z.any(),
	user_id: z.any(),
	name: z.any(),
	token: z.any(),
	permissions: z.any(),
	expires_at: z.any(),
});

// Zod schema for JwtGuardConfig type
export const JwtGuardConfigSchema = z.object({
	driver: z.literal("jwt"),
	useCookie: UseCookieSchema,
	userModel: UserModelConstraintSchema,
	rolePermissionModel: RolePermissionModelConstraintSchema.optional(),
	tokenModel: TokenModelConstraintSchema.optional(),
});
