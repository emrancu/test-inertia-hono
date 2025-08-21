import { Cookie, parseLifetime } from "../cookie";
import { getEnv } from "../core/request";
import { App } from "../core";
import type { Context } from "hono";

export interface SessionData {
	[key: string]: any;
}

export class SessionManager {
	private sessionId: string;
	private data: SessionData = {};
	private context: Context;
	private kvStore?: any;
	private isModified: boolean = false;

	constructor(context: Context, sessionId?: string) {
		this.context = context;
		this.sessionId = sessionId || this.generateSessionId();
		
		// Check if KV store is configured
		if (App.config.session.driver === "kv") {
			const kvBindingName = getEnv("KV_BINDING_NAME", "kv") as string;
			this.kvStore = context.env?.[kvBindingName];
			
			if (!this.kvStore) {
				console.warn(`KV binding '${kvBindingName}' not found. Session will fall back to cookie storage.`);
			}
		}
	}

	/**
	 * Initialize session data
	 */
	async initialize(): Promise<void> {
		if (this.kvStore) {
			// Load from KV store
			await this.loadFromKV();
		} else {
			// Load from cookie
			await this.loadFromCookie();
		}
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return crypto.randomUUID();
	}

	/**
	 * Load session data from KV store
	 */
	private async loadFromKV(): Promise<void> {
		try {
			const data = await this.kvStore.get(`session:${this.sessionId}`, "json");
			this.data = data || {};
		} catch (error) {
			console.error("Error loading session from KV:", error);
			this.data = {};
		}
	}

	/**
	 * Load session data from cookie
	 */
	private async loadFromCookie(): Promise<void> {
		try {
			const cookieData = await Cookie.get(App.config.session.cookie);
			if (cookieData) {
				const parsed = JSON.parse(cookieData);
				if (parsed.sessionId === this.sessionId) {
					this.data = parsed.data || {};
				}
			}
		} catch (error) {
			console.error("Error loading session from cookie:", error);
			this.data = {};
		}
	}

	/**
	 * Save session data
	 */
	async save(): Promise<void> {
		if (!this.isModified) return;

		if (this.kvStore) {
			await this.saveToKV();
		} else {
			await this.saveToCookie();
		}
		
		this.isModified = false;
	}

	/**
	 * Save session data to KV store
	 */
	private async saveToKV(): Promise<void> {
		try {
			const rememberLogin = await Cookie.get("remember_login");
			
			// Parse session lifetime - supports formats like '10m', '10s', '10h', '10d' or plain numbers (minutes)
			const lifetimeInSeconds = rememberLogin 
				? parseLifetime("10d") // 10 days for remember login
				: typeof App.config.session.lifetime === "string" 
					? parseLifetime(App.config.session.lifetime)
					: App.config.session.lifetime * 60; // fallback: treat as minutes

			const expirationTime = new Date(Date.now() + lifetimeInSeconds * 1000);

			await this.kvStore.put(
				`session:${this.sessionId}`,
				JSON.stringify(this.data),
				{
					expiration: Math.floor(expirationTime.getTime() / 1000)
				}
			);
		} catch (error) {
			console.error("Error saving session to KV:", error);
			throw error;
		}
	}

	/**
	 * Save session data to cookie
	 */
	private async saveToCookie(): Promise<void> {
		try {
			const sessionData = {
				sessionId: this.sessionId,
				data: this.data
			};

			const rememberLogin = await Cookie.get("remember_login");
			const maxAge = rememberLogin ? "10d" : App.config.session.lifetime;

			Cookie.set(
				App.config.session.cookie,
				JSON.stringify(sessionData),
				maxAge
			);
		} catch (error) {
			console.error("Error saving session to cookie:", error);
			throw error;
		}
	}

	/**
	 * Get a value from session
	 */
	get<T = any>(key: string, defaultValue?: T): T {
		return this.data[key] ?? defaultValue;
	}

	/**
	 * Set a value in session
	 */
	set(key: string, value: any): void {
		this.data[key] = value;
		this.isModified = true;
	}

	/**
	 * Check if a key exists in session
	 */
	has(key: string): boolean {
		return key in this.data;
	}

	/**
	 * Remove a key from session
	 */
	forget(key: string): void {
		delete this.data[key];
		this.isModified = true;
	}

	/**
	 * Set a flash message (one-time message)
	 */
	flash(key: string, value: any): void {
		if (!this.data._flash) {
			this.data._flash = {};
		}
		this.data._flash[key] = value;
		this.isModified = true;
	}

	/**
	 * Get and remove a flash message
	 */
	getFlash<T = any>(key: string, defaultValue?: T): T {
		if (!this.data._flash || !(key in this.data._flash)) {
			return defaultValue as T;
		}
		
		const value = this.data._flash[key];
		delete this.data._flash[key];
		this.isModified = true;
		return value;
	}

	/**
	 * Get all session data
	 */
	all(): SessionData {
		return { ...this.data };
	}

	/**
	 * Clear all session data
	 */
	clear(): void {
		this.data = {};
		this.isModified = true;
	}

	/**
	 * Destroy the session
	 */
	async destroy(): Promise<void> {
		if (this.kvStore) {
			try {
				await this.kvStore.delete(`session:${this.sessionId}`);
			} catch (error) {
				console.error("Error destroying session in KV:", error);
			}
		}
		
		// Always clear the cookie
		Cookie.delete(App.config.session.cookie);
		this.data = {};
		this.isModified = false;
	}

	/**
	 * Get session ID
	 */
	getId(): string {
		return this.sessionId;
	}

	/**
	 * Regenerate session ID
	 */
	async regenerate(): Promise<void> {
		const oldSessionId = this.sessionId;
		this.sessionId = this.generateSessionId();
		
		// If using KV, delete old session
		if (this.kvStore) {
			try {
				await this.kvStore.delete(`session:${oldSessionId}`);
			} catch (error) {
				console.error("Error deleting old session from KV:", error);
			}
		}
		
		this.isModified = true;
		await this.save();
	}
}
