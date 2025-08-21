import { drizzle } from "drizzle-orm/d1";
import { getEnv } from "../src/core";
import { DatabaseConfig } from "../src/type-declaration";

export const databaseConfig: DatabaseConfig = {
	default: "d1",

	connections: {
		d1: {
			connection: (): ReturnType<typeof drizzle> => drizzle(getEnv("DB")),
		},
	},
};
