import { z } from "zod";
import { JwtGuardConfigSchema } from "./jwt-guard";

const RolePermissionSchema = z.object({
	id: z.number(),
	role: z.string(),
	permissions: z.array(z.string()),
});

export const AuthUserSchema = z.object({
	id: z.number(),
	name: z.string(),
	email: z.string().email(),
	rolePermissions: RolePermissionSchema.nullish(), // Optional or null
});

const JwtTokenPayloadSchema = z
	.object({
		name: z.string().max(100).optional(),
		user: AuthUserSchema,
		permissions: z.array(z.string().max(50)).max(5).optional(),
		// maxAge: z.union([
		// 	z.number().nonnegative(),
		// 	z.string()
		// 		.regex(
		// 			/^\d+[smhd]$/,
		// 			"String must follow the format '1s', '2m', '3h', or '4d'",
		// 		),
		// ]),
	})
	.catchall(z.unknown());

export { JwtGuardConfigSchema, JwtTokenPayloadSchema };
