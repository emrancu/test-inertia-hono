import { getSession } from "../session";
import { AppRequest } from "../core";

/**
 * Laravel-style CSRF Helper Class
 */
export class Csrf {
    /**
     * Get the current CSRF token
     */
    static token(): string | null {
        try {
            const session = getSession();
            return session.get('_csrf_token') || null;
        } catch (error) {
            console.error("Failed to get CSRF token:", error);
            return null;
        }
    }

    /**
     * Generate a new CSRF token (Laravel-style)
     */
    static generateToken(): string {
        const array = new Uint8Array(20);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Regenerate the CSRF token
     */
    static async regenerateToken(): Promise<string> {
        try {
            const session = getSession();
            const newToken = this.generateToken();
            
            session.set('_csrf_token', newToken);
            session.set('_csrf_token_time', Date.now());
            
            // Hash the token for additional security
            const hashedToken = await this.hashToken(newToken);
            session.set('_csrf_token_hash', hashedToken);
            
            return newToken;
        } catch (error) {
            console.error("Failed to regenerate CSRF token:", error);
            throw error;
        }
    }

    /**
     * Force CSRF token regeneration on next request
     */
    static forceRegeneration(): void {
        try {
            const session = getSession();
            session.set('_force_csrf_regeneration', true);
        } catch (error) {
            console.error("Failed to force CSRF regeneration:", error);
        }
    }

    /**
     * Check if the given token matches the session token
     */
    static async verify(token: string): Promise<boolean> {
        if (!token) return false;
        
        try {
            const session = getSession();
            const sessionToken = session.get('_csrf_token');
            
            if (!sessionToken) return false;
            
            // Direct comparison
            if (this.timingSafeEquals(sessionToken, token)) {
                return true;
            }
            
            // Check against hashed version
            const storedHash = session.get('_csrf_token_hash');
            if (storedHash) {
                const tokenHash = await this.hashToken(token);
                return this.timingSafeEquals(tokenHash, storedHash);
            }
            
            return false;
        } catch (error) {
            console.error("Failed to verify CSRF token:", error);
            return false;
        }
    }

    /**
     * Get CSRF token from current request
     */
    static getTokenFromRequest(): string | null {
        try {
            const context = AppRequest.getContext();
            
            return context.req.header("X-CSRF-TOKEN") ||
                   context.req.header("X-XSRF-TOKEN") ||
                   AppRequest.input("_token") as string ||
                   AppRequest.input("csrf_token") as string ||
                   null;
        } catch (error) {
            console.error("Failed to get token from request:", error);
            return null;
        }
    }

    /**
     * Create CSRF hidden input field (Laravel-style)
     */
    static field(): string {
        const token = this.token();
        if (!token) return '';
        
        return `<input type="hidden" name="_token" value="${token}">`;
    }

    /**
     * Create CSRF meta tag (Laravel-style)
     */
    static meta(): string {
        const token = this.token();
        if (!token) return '';
        
        return `<meta name="csrf-token" content="${token}">`;
    }

    /**
     * Get CSRF token for JavaScript (Laravel-style)
     */
    static jsToken(): string {
        const token = this.token();
        return token ? `window.Laravel = { csrfToken: '${token}' };` : '';
    }

    /**
     * Private helper methods
     */
    private static async hashToken(token: string): Promise<string> {
        const encoder = new TextEncoder();
        const data = encoder.encode(token);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    private static timingSafeEquals(a: string, b: string): boolean {
        if (a.length !== b.length) return false;
        
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
}

/**
 * Laravel-style helper functions (global)
 */

/**
 * Get CSRF token (Laravel csrf_token() helper)
 */
export function csrf_token(): string | null {
    return Csrf.token();
}

/**
 * Get CSRF field (Laravel csrf_field() helper)  

export function csrf_field(): string {
    return Csrf.field();
}
export function setupCsrfForFetch() {
	if (typeof window === 'undefined') return;
 * Get CSRF meta tag (Laravel csrf_meta() helper)
	const originalFetch = window.fetch;
export function csrf_meta(): string {
    return Csrf.meta();
}

/**
 * Regenerate CSRF token (Laravel-style)
 */
export async function regenerate_csrf_token(): Promise<string> {
    return await Csrf.regenerateToken();w() / 1000).toString()
			};
		}
		
 * Verify CSRF token (Laravel-style)put, init);
	};
export async function verify_csrf_token(token: string): Promise<boolean> {
    return await Csrf.verify(token);
}