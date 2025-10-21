import {
	AppConfig,
	AuthConfig,
	Config,
	CorsConfig,
	CsrfTokenConfig,
	DatabaseConfig,
	Events,
	JwtGuardConfig,
	SessionGuardConfig,
	MiddlewareAliasType,
	MiddlewaresConfig,
	QueueConfig,
	SessionConfig,
	SocialAuth,
} from "./config";
import { JWTPayload } from "./jwt";
import { MiddlewareClass, MiddlewareInstance } from "./middleware";
import {
	ApiTokenPayload,
	AuthUser,
	AuthenticatedUser,
	RolePermission,
	TokenData,
} from "./model";
import { DefineRouteFunction, HandlerFunction, HttpMethod } from "./route";

export type SocialAuthUser = {
	id: string;
	email?: string;
	name: string;
	username?: string;
	avatar: string;
};

export {
	MiddlewareAliasType,
	AppConfig,
	SessionConfig,
	SessionGuardConfig,
	AuthUser,
	MiddlewareClass,
	MiddlewareInstance,
	HandlerFunction,
	HttpMethod,
	AuthConfig,
	Config,
	DatabaseConfig,
	AuthenticatedUser,
	TokenData,
	RolePermission,
	DefineRouteFunction,
	ApiTokenPayload,
	JwtGuardConfig,
	CorsConfig,
	CsrfTokenConfig,
	MiddlewaresConfig,
	Events,
	QueueConfig,
	JWTPayload,
	SocialAuth,
};
