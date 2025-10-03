import { CsrfTokenConfig } from "../src/type-declaration";

/**
 * CSRF Configuration (Laravel-style)
 * 
 * This configuration provides CSRF protection identical to Laravel's implementation.
 * CSRF focuses ONLY on token validation and origin checking - NOT header restrictions.
 * 
 * Laravel CSRF Features:
 * - Token validation (_token form field, X-CSRF-TOKEN header, X-XSRF-TOKEN header)
 * - Origin/Referer validation (same-origin requests only)
 * - Excluded paths (like Laravel's $except property)
 * - Rate limiting protection
 * - User agent validation
 * 
 * Laravel Equivalent Usage:
 * - HTML Forms: <input type="hidden" name="_token" value="{{ csrf_token() }}" />
 * - JavaScript: X-CSRF-TOKEN header or X-XSRF-TOKEN (automatic with Axios)
 * - Get token: csrf() import {csrf} from 'flying-worker/supports'
 * 
 * Note: Header restrictions are handled by CORS, not CSRF (like Laravel)
 * Excluded paths: /api/* (API routes typically use different authentication)
 */
export const CsrfConfig: CsrfTokenConfig = {
	avoidPath: ['/api/*'] // Equivalent to Laravel's $except property
};
