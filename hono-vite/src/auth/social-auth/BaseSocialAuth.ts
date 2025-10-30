import { App, AppRequest } from "../../core";
import { resolveAuth } from "../Auth";
import { SocialAuthUser, AuthenticatedUser } from "../../type-declaration";

type LoginOptions = {
	guard?: string;
	remember?: boolean;
	maxAge?: string | number;
	tokenName?: string;
	permissions?: string[];
	createUserCallback?: (socialUser: SocialAuthUser) => Promise<any>;
};

/**
 * Base class for social authentication providers
 * Provides common functionality for OAuth flows
 */
export abstract class BaseSocialAuth {
	protected guardsName: string | null = null;

	/**
	 * Set the guard to use for authentication
	 */
	public guard(guard: string): this {
		this.guardsName = guard;
		return this;
	}

	/**
	 * Get current guard or default
	 */
	protected getCurrentGuard(): string {
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
	 * Abstract methods to be implemented by each provider
	 */
	abstract redirect(): Response;
	abstract getUser(): Promise<SocialAuthUser | null>;

	/**
	 * Login the social user using the Auth system
	 * This method will automatically use session or JWT based on the guard
	 */
	public async login(options: LoginOptions = {}): Promise<string | boolean> {
		const socialUser = await this.getUser();

		if (!socialUser) {
			return false;
		}

		const guard = options.guard || this.getCurrentGuard();
		const Auth = resolveAuth();

		// If createUserCallback is provided, use it to get/create the user
		if (options.createUserCallback) {
			const user = await options.createUserCallback(socialUser);

			if (!user) {
				return false;
			}

			// Login with the user from callback
			const result = await Auth.guard(guard).login(user, {
				remember: options.remember,
				maxAge: options.maxAge,
				tokenName: options.tokenName,
				permissions: options.permissions,
			});

			// Return token for JWT guards, true for session guards
			return typeof result === "string" ? result : true;
		}

		// If no callback, just login with social user data directly
		// This assumes your user table structure matches SocialAuthUser
		try {
			const result = await Auth.guard(guard).login(
				{
					...socialUser,
					id: Number(socialUser.id),
					email: socialUser.email || "",
				},
				{
					remember: options.remember,
					maxAge: options.maxAge,
					tokenName: options.tokenName,
					permissions: options.permissions,
				},
			);

			return typeof result === "string" ? result : true;
		} catch (error) {
			console.error("Social auth login failed:", error);
			return false;
		}
	}

	/**
	 * Get the authenticated user after social login
	 */
	public async user(): Promise<AuthenticatedUser | null> {
		const Auth = resolveAuth();
		const guard = this.getCurrentGuard();
		return await Auth.guard(guard).user();
	}
}


