import { HTTPException } from "hono/http-exception";
import { App, AppRequest } from "../../core";
import { Session } from "../../session";
import { Str } from "../../supports";
import { SocialAuthUser } from "../../type-declaration";
import { BaseSocialAuth } from "./BaseSocialAuth";

export class Linkedin extends BaseSocialAuth {
	private getState() {
		return Str.uuid();
	}

	public redirect() {
		const config = App.config.socialAuth?.linkedin
			? App.config.socialAuth.linkedin
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "LinkedIn OAuth not configured" });
		}

		const newState = this.getState();

		const parsedOptions = Str.toQueryParams({
			response_type: "code",
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
			client_id: config.clientId,
			scope: config.scopes.join(" "),
			state: newState,
		});

		Session.put("state", newState);

		return AppRequest.getContext().redirect(
			`https://www.linkedin.com/oauth/v2/authorization?${parsedOptions}`,
		);
	}

	private async getTokenFromCode() {
		const config = App.config.socialAuth?.linkedin
			? App.config.socialAuth.linkedin
			: null;
		if (!config) {
			throw new HTTPException(401, { message: "LinkedIn OAuth not configured" });
		}

		if (!AppRequest.input("code")) {
			throw new Error("Code not found");
		}

		if (AppRequest.input("state") !== Session.get("state")) {
			throw new HTTPException(401, { message: "Invalid state parameter" });
		}

		const params = Str.toQueryParams({
			grant_type: "authorization_code",
			code: AppRequest.input("code"),
			client_id: config.clientId,
			client_secret: config.clientSecret,
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
		});

		const response = await fetch(
			`https://www.linkedin.com/oauth/v2/accessToken?${params}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
			},
		).then((res) => res.json());

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

		const response = await fetch("https://api.linkedin.com/v2/userinfo", {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		}).then((res) => res.json());
		if ("message" in response) {
			throw new HTTPException(400, { message: response.message });
		}
		if ("sub" in response) {
			return {
				id: response.sub,
				name: response.name,
				email: response.email,
				avatar: response.picture,
			};
		}

		return null;
	}
}
