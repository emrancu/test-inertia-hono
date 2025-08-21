import { Ai, D1Database, KVNamespace } from "@cloudflare/workers-types";



type Env = {
	APP_NAME: string;
	APP_SECRET: string;
	SESSION_DRIVER: string;
	KV_BINDING_NAME: string;
	kv: KVNamespace;
	APP_MAINTENANCE_MODE: boolean;
	QUEUE_MODE: boolean;
	D1_BINDING_NAME: string;
	D1_DB_NAME: string;

	kv: KVNamespace;
	DB: D1Database;
	AI: Ai;
} & Record<string, unknown>;
