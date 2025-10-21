import { HTTPException } from "hono/http-exception";
import { App, AppRequest } from "../../core";
import { Session } from "../../session";
import { Str } from "../../supports";
import { SocialAuthUser } from "../../type-declaration";
import { BaseSocialAuth } from "./BaseSocialAuth";

export class Twitter extends BaseSocialAuth {
	private getState() {
		return Str.uuid();
	}

	private generateRandomString() {
		const characters =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
		const length = Math.floor(Math.random() * (128 - 43 + 1)) + 43;
		return Array.from({ length }, () => {
			const randomIndex = Math.floor(Math.random() * characters.length);
			return characters.charAt(randomIndex);
		}).join("");
	}

	private base64URLEncode(str: string) {
		return str.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
	}

	private async getCodeChallenge() {
		const codeVerifier = this.generateRandomString();
		const encoder = new TextEncoder();
		const encoded = encoder.encode(codeVerifier);
		const shaEncoded = await crypto.subtle.digest("SHA-256", encoded);
		const strEncoded = btoa(String.fromCharCode(...new Uint8Array(shaEncoded)));
		const codeChallenge = this.base64URLEncode(strEncoded);
		return { codeVerifier, codeChallenge };
	}

	public async redirect() {
		const config = App.config.socialAuth?.x ? App.config.socialAuth.x : null;
		if (!config) {
			throw new HTTPException(401, { message: "X/Twitter OAuth not configured" });
		}

		const newState = this.getState();
		const challenge = await this.getCodeChallenge();

		const parsedOptions = Str.toQueryParams({
			response_type: "code",
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
			client_id: config.clientId,
			scope: config.scopes.join(" "),
			state: newState,
			code_challenge: challenge.codeChallenge,
			code_challenge_method: "S256",
		});

		Session.put("state", newState);
		Session.put("x-codeVerifier", challenge.codeVerifier);

		return AppRequest.getContext().redirect(
			`https://x.com/i/oauth2/authorize?${parsedOptions}`,
		);
	}

	private async getTokenFromCode() {
		const config = App.config.socialAuth?.x ? App.config.socialAuth.x : null;
		if (!config) {
			throw new HTTPException(401, { message: "X/Twitter OAuth not configured" });
		}

		if (!AppRequest.input("code")) {
			throw new Error("Code not found");
		}

		if (AppRequest.input("state") !== Session.get("state")) {
			throw new HTTPException(401, { message: "Invalid state parameter" });
		}

		const challenge = await this.getCodeChallenge();
		const parsedOptions = Str.toQueryParams({
			code: AppRequest.input("code"),
			grant_type: "authorization_code",
			client_id: config.clientId,
			redirect_uri: AppRequest.getBaseUrl() + config.redirectPath,
			code_verifier: Session.get("x-codeVerifier"),
		});

		const authToken = btoa(
			`${encodeURIComponent(config.clientId)}:${encodeURIComponent(config.clientSecret)}`,
		);

		const response = await fetch(
			`https://api.twitter.com/2/oauth2/token?${parsedOptions}`,
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${authToken}`,
				},
			},
		).then((res) => res.json());

		Session.forget("state");
		Session.forget("x-codeVerifier");

		if ("error" in response) {
			throw new HTTPException(400, { message: response.error_description });
		}
		if ("access_token" in response) {
			return response.access_token;
		}
	}

	async getUser(): Promise<SocialAuthUser | null> {
		const token = await this.getTokenFromCode();

		const parsedOptions = Str.toQueryParams({
			"user.fields": ["profile_image_url"],
		});

		const response = await fetch(
			`https://api.twitter.com/2/users/me?${parsedOptions}`,
			{
				headers: {
					authorization: `Bearer ${token}`,
				},
			},
		).then((res) => res.json());
		if ("error_description" in response) {
			throw new HTTPException(400, { message: response.error_description });
		}

		if ("data" in response) {
			return {
				name: response.data.name,
				id: response.data.id,
				username: response.data.username,
				avatar: response.data.profile_image_url,
			};
		}

		return null;
	}
}
