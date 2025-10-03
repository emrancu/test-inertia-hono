import type { Context, Next } from "hono";
import { Cookie } from "../cookie";
import { App, AppRequest } from "../core";
import BaseMiddleware from "../core/abstraction/BaseMiddleware";
import { Session } from "../session";

export default class CsrfToken extends BaseMiddleware {
  /** $except (supports trailing *) */
  protected isExceptPath = (path: string): boolean => {
    return App.config.csrf.avoidPath.some((pattern: string) => {
      if (pattern.endsWith("*")) {
        return path.startsWith(pattern.slice(0, -1));
      }
      return path === pattern;
    });
  };

  /** Safe/reading methods */
  private isReading(method: string): boolean {
    return method === "GET" || method === "HEAD" || method === "OPTIONS";
  }

  /** Case-insensitive header getter */
  private getHeader(context: Context, name: string): string | null {
    return (
      context.req.header(name) ||
      context.req.header(name.toLowerCase()) ||
      context.req.header(name.toUpperCase()) ||
      null
    );
  }

  /** Token sources: body _token, X-CSRF-TOKEN, X-XSRF-TOKEN */
  private getTokenFromRequest(context: Context): string | null {
    return (
      AppRequest.input("_token") ||
      this.getHeader(context, "X-CSRF-TOKEN") ||
      this.getHeader(context, "X-XSRF-TOKEN") ||
      null
    );
  }

  /** 40-char hex token */
  private generateToken(): string {
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, "0")).join("");
  }

  /** Ensure session has token (no per-request rotation) */
  private ensureSessionToken(): string {
    let sessionToken = Session.get("_token");
    if (typeof sessionToken !== "string" || sessionToken.length !== 40) {
      sessionToken = this.generateToken();
      Session.put("_token", sessionToken);
    }
    return sessionToken;
  }

  /** Constant-time compare */
  private timingSafeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }

  /** Compare provided token vs session token */
  private tokensMatch(context: Context): boolean {
    const providedToken = this.getTokenFromRequest(context);
    const sessionToken = Session.get("_token");
    return (
      typeof sessionToken === "string" &&
      typeof providedToken === "string" &&
      this.timingSafeEquals(sessionToken, providedToken)
    );
  }

  /** Set XSRF-TOKEN cookie (readable by JS; SameSite=Lax) */
  private addCookieToResponse(context: Context, token: string): void {
    // Use unsigned cookie so JavaScript can read it (required for CSRF)
    Cookie.setUnsigned("XSRF-TOKEN", token, {
      httpOnly: false, // Must be false for JS access
      secure: true,    // Secure in production
      sameSite: "Lax"  // CSRF protection
    });
  }

  public async boot(context: Context, next: Next) {
	if (!App.getCurrentState("is_active_session_middleware")) { 
		return context.json({ message: "Session middleware is not active.", errors: {} }, 403); 
	}

	// 1. Always allow excepted paths (API routes)
	if (this.isExceptPath(context.req.path)) {
	  await next();
	  return;
	}

	// Ensure token exists (first GET issues cookie)
	const sessionToken = this.ensureSessionToken();
  
	// 2. Always allow reading requests (GET/HEAD/OPTIONS)
	if (this.isReading(context.req.method)) {
	  this.addCookieToResponse(context, sessionToken);
	  App.addToCurrentState("csrfToken", sessionToken);
	  await next();
	  return;
	}
  
	// 3. For state-changing requests, validate CSRF token
	if (this.tokensMatch(context)) {
	  this.addCookieToResponse(context, sessionToken);
	  App.addToCurrentState("csrfToken", sessionToken);
	  await next();
	  return;
	}
  
	// 4. CSRF failure
	return context.json({ message: "CSRF token mismatch.", errors: {} }, 403);
  }
}
