import { AppConfig } from "../src/type-declaration";

export const appConfig: AppConfig = {
	name: "Flying Worker",

	secret: "12086fb500fc4bafae7d660773b554c6",

	environment: "development",

	url: "http://localhost:3000",

	timezone: "UTC",

	locale: "en",

	maintenance: {
		status: false,
		message: "<h1>We are performing maintenance. Please check back soon.</h1>",
	},

	apiPrefix: "api",

	apiRoute: async () => {
		// await import("../routes/api");
	},
	webRoute: async () => {
		await import("../routes/web");
	},
};
