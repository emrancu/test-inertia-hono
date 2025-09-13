import { Cookie, parseLifetime } from "../cookie";
import { getEnv } from "../core/request";
import { App } from "../core";
import type { Context } from "hono";

export interface SessionData {
	[key: string]: any;
}

export class SessionStore {
	private sessionId: string|undefined;
	private data: SessionData = {};
	private kvStore?: any;
	private isDirty: boolean = false;
	private isInitialized: boolean = false;

	constructor() {
		if (App.config.session.driver === "kv") {
			const kvBindingName = getEnv("KV_BINDING_NAME", "kv") as string;
			this.kvStore = App.getContext().env?.[kvBindingName];
			
			if (!this.kvStore) {
				console.warn(`KV binding '${kvBindingName}' not found. Fallback to cookie storage.`);
			}
		}
	}

	/**
	 * Initialize session data
	 */
	async initialize(): Promise<void> {
		let sessionCookie: string | undefined;
		try {
			const cookie = await Cookie.get(App.config.session.cookie_name);
			sessionCookie = cookie || undefined;
		} catch (error) {
			// Ignore cookie errors
		}

		if (this.kvStore) {
			
			// KV: cookie = session ID, data from KV
			this.sessionId = sessionCookie || this.generateSessionId();
			await this.loadFromKV();
		} else {
			// Cookie: everything from cookie
			await this.loadFromCookie(sessionCookie);
			if (!this.sessionId) {
				this.sessionId = this.generateSessionId();
			}
		}

		this.isInitialized = true;
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
			const sessionData = await this.kvStore.get(`session:${this.sessionId}`);
			if (sessionData) {
				this.data = JSON.parse(sessionData);
			}
		} catch (error) {
			console.error("Error loading session from KV:", error);
			this.data = {};
		}
	}

	/**
	 * Load session data from cookie
	 */
	private async loadFromCookie(sessionCookie?: string): Promise<void> {
		try {
			const cookie = sessionCookie || await Cookie.get(App.config.session.cookie_name);
			if (cookie) {
				const sessionData = JSON.parse(cookie);
				this.sessionId = sessionData.sessionId;
				this.data = sessionData.data || {};
			}
		} catch (error) {
			console.error("Error loading session from cookie:", error);
			this.data = {};
		}
	}

	/**
	 * Set a session value - marks session as dirty
	 */
	put(key: string, value: any): void {
		if (!this.isInitialized) {
			throw new Error('Session not initialized. Ensure session middleware is applied.');
		}
		this.data[key] = value;
		this.isDirty = true;
	}

	/**
	 * Get a value from session
	 */
	get<T = any>(key: string, defaultValue?: T): T {
		if (!this.isInitialized) {
			throw new Error('Session not initialized. Ensure session middleware is applied.');
		}
		return this.data[key] ?? defaultValue;
	}

	/**
	 * Check if a key exists in session
	 */
	has(key: string): boolean {
		return key in this.data;
	}

	/**
	 * Remove a key from session - marks session as dirty
	 */
	forget(key: string): void {
		delete this.data[key];
		this.isDirty = true; // Mark as modified
	}

	/**
	 * Get all session data
	 */
	all(): SessionData {
		return { ...this.data };
	}

	/**
	 * Clear all session data - marks session as dirty
	 */
	flush(): void {
		this.data = {};
		this.isDirty = true; // Mark as modified
	}

	/**
	 * Get session ID
	 */
	getId(): string {
		return this.sessionId || '';
	}


	/**
	 * Save session data and renew expiry
	 */
	async save(): Promise<void> {
		// Clear flash data before saving
		this.clearFlash();

		// Always save to renew session expiry
		if (this.kvStore) {
			await this.saveToKV();
		} else {
			await this.saveToCookie();
		}

		// Reset dirty flag after successful save
		this.isDirty = false;
	}

	/**
	 * Save session data to KV store
	 */
	private async saveToKV(): Promise<void> {
		try {
			// Parse session lifetime
			const lifetimeInSeconds = typeof App.config.session.lifetime === "string" 
				? parseLifetime(App.config.session.lifetime)
				: App.config.session.lifetime * 60;

			const expirationTime = new Date(Date.now() + lifetimeInSeconds * 1000);

			// Save session data to KV store
			await this.kvStore.put(
				`session:${this.sessionId}`,
				JSON.stringify(this.data),
				{
					expiration: Math.floor(expirationTime.getTime() / 1000)
				}
			);

			// Save session ID in cookie
			const cookieLifetime = typeof App.config.session.lifetime === "string" 
				? App.config.session.lifetime
				: `${App.config.session.lifetime}m`;
				
			Cookie.set(
				App.config.session.cookie_name,
				this.sessionId!,
				cookieLifetime
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

			const cookieLifetime = typeof App.config.session.lifetime === "string" 
				? App.config.session.lifetime
				: `${App.config.session.lifetime}m`;
				
			Cookie.set(
				App.config.session.cookie_name,
				JSON.stringify(sessionData),
				cookieLifetime
			);
		} catch (error) {
			console.error("Error saving session to cookie:", error);
			throw error;
		}
	}

	/**
	 * Regenerate session ID (useful for security)
	 */
	regenerate(): void {
		this.sessionId = this.generateSessionId();
		this.isDirty = true;
	}

	/**
	 * Flash data - data that exists only for the next request
	 */
	flash(key: string, value: any): void {
		this.put(`_flash.${key}`, value);
	}

	/**
	 * Get flash data and remove it
	 */
	getFlash<T = any>(key: string, defaultValue?: T): T {
		const flashKey = `_flash.${key}`;
		const value = this.get(flashKey, defaultValue);
		this.forget(flashKey);
		return value;
	}

	/**
	 * Get all flash data and clear it
	 */
	getFlashBag(): SessionData {
		const flashData: SessionData = {};
		const keysToRemove: string[] = [];

		for (const key in this.data) {
			if (key.startsWith('_flash.')) {
				const flashKey = key.substring(7); // Remove '_flash.' prefix
				flashData[flashKey] = this.data[key];
				keysToRemove.push(key);
			}
		}

		// Remove flash data from session
		keysToRemove.forEach(key => this.forget(key));

		return flashData;
	}

	/**
	 * Clear all flash data without returning it
	 */
	private clearFlash(): void {
		for (const key in this.data) {
			if (key.startsWith('_flash.')) {
				this.forget(key);
			}
		}
	}
}

export const resolveSession = (): SessionStore => {
	return App.getContainer().resolve('Session', () => {
		const session = new SessionStore();
		// Don't auto-initialize here - middleware handles initialization 
		return session;
	});
};
