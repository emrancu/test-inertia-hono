import { App } from "../core";

export function DB(connection?: "d1" | string) {
	const type = connection || App.config.database.default;

	if (type && App.config.database.connections[type]) {
		return App.config.database.connections[type].connection();
	}

	throw new Error(`Unsupported database connection: ${type}`);
}
