import { HTTPException } from "hono/http-exception";
import { App, AppRequest } from "../../core";
import { Session } from "../../session";
import { Str } from "../../supports";
import { SocialAuthUser } from "../../type-declaration";
import { BaseSocialAuth } from "./BaseSocialAuth";

export class Google extends BaseSocialAuth {
	private getState() {
		return Str.uuid();
	}

	public redirect() {
		const config = App.config.socialAuth?.google
			? App.config.socialAuth.google
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "Google OAuth not configured" });
		}

		const newState = this.getState();

		const parsedOptions = Str.toQueryParams({
			response_type: "code",
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
			client_id: config.clientId,
			include_granted_scopes: true,
			scope: ["openid", "email", "profile"].join(" "),
			state: newState,
		});

		Session.set("state", newState);

		return AppRequest.getContext().redirect(
			`https://accounts.google.com/o/oauth2/v2/auth?${parsedOptions}`,
		);
	}

	private async getTokenFromCode() {
		const config = App.config.socialAuth?.google
			? App.config.socialAuth.google
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "Google OAuth not configured" });
		}

		if (!AppRequest.input("code")) {
			throw new Error("Code not found");
		}

		if (AppRequest.input("state") !== Session.get("state")) {
			throw new HTTPException(401, { message: "Invalid state parameter" });
		}

		const response = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({
				client_id: config.clientId,
				client_secret: config.clientSecret,
				redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
				code: AppRequest.input("code"),
				grant_type: "authorization_code",
			}),
		}).then((res) => res.json());

		Session.forget("state");

		if ("error" in response) {
			throw new HTTPException(400, { message: response.error_description });
		}

		if ("access_token" in response) {
			return response.access_token;
		}
	}

	async getUser(): Promise<SocialAuthUser | null> {
		const token = await this.getTokenFromCode();

		const response = await fetch(
			"https://www.googleapis.com/oauth2/v2/userinfo",
			{
				headers: {
					authorization: `Bearer ${token}`,
				},
			},
		).then((res) => res.json());
		if ("error" in response) {
			throw new HTTPException(400, { message: response.error?.message });
		}

		if ("id" in response) {
			return {
				id: response.id,
				email: response.email,
				name: response.name,
				avatar: response.picture,
			};
		}

		return null;
	}
}
