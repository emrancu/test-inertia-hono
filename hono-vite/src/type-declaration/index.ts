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
	GoogleOAuth,
	LinkedInOAuth,
	XOAuth,
	Github,
} from "./config";
import { JWTPayload, JwtMiddlewareOptions } from "./jwt";
import { MiddlewareClass, MiddlewareInstance } from "./middleware";
import {
	ApiTokenPayload,
	AuthUser,
	AuthenticatedUser,
	RolePermission,
	TokenData,
} from "./model";
import { DefineRouteFunction, HandlerFunction, HttpMethod } from "./route";
import {
	R2Config,
	UploadOptions,
	FileInfo,
	ListOptions,
	ListResult,
} from "./storage";

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
	JwtMiddlewareOptions,
	SocialAuth,
	GoogleOAuth,
	LinkedInOAuth,
	XOAuth,
	Github,
	R2Config,
	UploadOptions,
	FileInfo,
	ListOptions,
	ListResult,
};
