import { SocialAuth } from "../src/type-declaration";

export const socialAuth: SocialAuth = {
	google: {
		clientId:
			"1010481481508-eiadf68ej77qc0n1gfg4s74kum31fh43.apps.googleusercontent.com",
		clientSecret: "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",
		redirectPath: "/web/callback",
	},
	x: {
		clientId: "c01wV281Qm1nV2dqNVJDa0NOTmU6MTpjaQ",
		clientSecret: "UPOqBYlBLekBKdidRgjBmI2xzWz1wtQeZ3NREk4dY34dnV_NSR",
		redirectPath: "/web/callback",
		scopes: ["tweet.read", "users.read"],
	},
	linkedin: {
		clientId: "868cx8j6y5mo8p",
		clientSecret: "WPL_AP1.oME5nPrE8sdgfJDY.L5gHAQ==",
		redirectPath: "/web/callback",
		scopes: ["email", "openid", "profile"],
	},
	github: {
		clientId: "Ov23liCdKLGFU0w0p7CR",
		clientSecret: "006cd55f9c8b36ce91998f2b6a1c38ea24f26c0c",
		redirectPath: "/web/callback",
		scopes: ["read:user", "user", "user:email"],
	},
};

 
