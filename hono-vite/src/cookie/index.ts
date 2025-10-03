import { deleteCookie, getCookie, getSignedCookie, setCookie, setSignedCookie } from "hono/cookie";
import { AppRequest } from "../core";
import { App } from "../core";

export function parseLifetime(duration: string) {
	const match = duration.match(/^(\d+)([smhd])$/);
	if (!match) throw new Error("Invalid duration format");

	const value = Number.parseInt(match[1], 10);
	const unit = match[2];

	switch (unit) {
		case "s":
			return value;
		case "m":
			return value * 60;
		case "h":
			return value * 60 * 60;
		case "d":
			return value * 24 * 60 * 60;
		default:
			throw new Error("Invalid duration unit");
	}
}

export const Cookie = {
	/**
	 * Set a signed cookie (secure, server-side only)
	 */
	set: async (name: string, value: string, maxAge: string | number | null = null) => {
		const maxAgeValue = maxAge ?? App.config.session.lifetime;

		const expiresInSeconds =
			typeof maxAgeValue === "string"
				? parseLifetime(maxAgeValue)
				: maxAgeValue;

		await setSignedCookie(AppRequest.getContext(), name, value, App.config.app.secret, {
			path: App.config.session.path,
			secure: App.config.session.secure,
			httpOnly: App.config.session.httpOnly,
			maxAge: expiresInSeconds,
			sameSite: App.config.session.sameSite,
		});
	},

	/**
	 * Set an unsigned cookie (readable by JavaScript)
	 * Used for CSRF tokens that need client-side access
	 */
	setUnsigned: (name: string, value: string, options: { httpOnly?: boolean; secure?: boolean; sameSite?: string } = {}) => {
		setCookie(AppRequest.getContext(), name, value, {
			path: "/",
			secure: options.secure ?? App.config.session.secure,
			httpOnly: options.httpOnly ?? false, // Default false for JS access
			sameSite: (options.sameSite ?? "Lax") as "Strict" | "Lax" | "None",
			maxAge: 60 * 60 * 24, // 24 hours for CSRF tokens
		});
	},

	/**
	 * Get a signed cookie
	 */
	get: async (name: string) => {
		return await getSignedCookie(
			AppRequest.getContext(),
			App.config.app.secret,
			name,
		);
	},

	/**
	 * Get an unsigned cookie
	 */
	getUnsigned: (name: string) => {
		return getCookie(AppRequest.getContext(), name);
	},

	/**
	 * Delete a cookie
	 */
	delete: (name: string) => {
		deleteCookie(AppRequest.getContext(), name);
	},
};
