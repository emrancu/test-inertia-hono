import { deleteCookie, getSignedCookie, setSignedCookie } from "hono/cookie";
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
	set: (name: string, value: string, maxAge: string | number | null = null) => {
		const maxAgeValue = maxAge ?? App.config.session.lifetime;

		let expiresInSeconds =
			typeof maxAgeValue === "string"
				? parseLifetime(maxAgeValue)
				: maxAgeValue;

		setSignedCookie(AppRequest.getContext(), name, value, App.config.app.secret, {
			path: App.config.session.path,
			secure: App.config.session.secure,
			httpOnly: App.config.session.httpOnly,
			maxAge: expiresInSeconds,
			sameSite: App.config.session.sameSite,
		}).then();
	},

	get: async (name: string) => {
		const data = await getSignedCookie(
			AppRequest.getContext(),
			App.config.app.secret,
			name,
		);

		return data;
	},
	delete: (name: string) => {
		deleteCookie(AppRequest.getContext(), name);
	},
};
