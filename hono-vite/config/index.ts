import { Config } from "../src/type-declaration";
import { appConfig } from "./app";
import { authConfig } from "./auth";
import { corsConfig } from "./cors";
import { CsrfConfig } from "./csrf";
// import { databaseConfig } from "./database";
// import { eventListener } from "./event-listener";
import { middlewaresConfig } from "./middlewares";
// import { queue } from "./queue";
import { r2Config } from "./r2";
import { sessionConfig } from "./session";
import { socialAuth } from "./social-auth";

const config: Config = {
	app: appConfig,
	session: sessionConfig,
	auth: authConfig,
	// database: databaseConfig,
	cors: corsConfig,
	csrf: CsrfConfig,
	middlewares: middlewaresConfig,
	// eventListener: eventListener,
	// queue: queue,
	socialAuth: socialAuth,
	r2: r2Config,
};

export default config;
