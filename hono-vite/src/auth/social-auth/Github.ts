import { HTTPException } from "hono/http-exception";
import { App, AppRequest } from "../../core";
import { Session } from "../../session";
import { Str } from "../../supports";
import { SocialAuthUser } from "../../type-declaration";
import { BaseSocialAuth } from "./BaseSocialAuth";

const userAgent: string = "FlyingWorker-Auth-App";

export class Github extends BaseSocialAuth {
	private getState() {
		return Str.uuid();
	}

	public redirect() {
		const config = App.config.socialAuth?.github
			? App.config.socialAuth.github
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "Github OAuth not configured" });
		}

		const newState = this.getState();

		let options: {
			client_id: string;
			state: string;
			oauthApp: boolean;
			scope?: string[];
			redirect_uri?: string;
		} = {
			client_id: config.clientId,
			state: newState,
			oauthApp: false,
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
		};

		// For GitHub apps, the scope is configured during the app setup / creation.
		// For OAuth apps, we need to provide the scope.

		if (config.oauthApp) {
			options.oauthApp = true;
			options.scope = config.scopes ?? [];

			options.redirect_uri = undefined;
		}

		const queryParams = Str.toQueryParams(options);

		Session.set("state", newState);

		return AppRequest.getContext().redirect(
			`https://github.com/login/oauth/authorize?${queryParams}`,
		);
	}

	private async getTokenFromCode() {
		const config = App.config.socialAuth?.github
			? App.config.socialAuth.github
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "Github OAuth not configured" });
		}

		if (!AppRequest.input("code")) {
			throw new Error("Code not found");
		}

		if (AppRequest.input("state") !== Session.get("state")) {
			throw new HTTPException(401, { message: "Invalid state parameter" });
		}

		const response = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				body: JSON.stringify({
					client_id: config.clientId,
					client_secret: config.clientSecret,
					code: AppRequest.input("code"),
				}),
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
			},
		).then((res) => res.json());
		if ("error_description" in response) {
			throw new HTTPException(400, { message: response.error_description });
		}
		if ("access_token" in response) {
			return response.access_token;
		}
	}

	async getUser(): Promise<SocialAuthUser | null> {
		const token = await this.getTokenFromCode();

		const response = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/json",
				"Content-Type": "application/json",
				"User-Agent": userAgent,
			},
		}).then((res) => res.json());

		if ("message" in response) {
			throw new HTTPException(400, { message: response.message });
		}

		if ("id" in response) {
			return {
				id: response.id.toString(),
				email: response.email,
				name: response.name || response.login,
				username: response.login,
				avatar: response.avatar_url,
			};
		}

		return null;
	}
}
