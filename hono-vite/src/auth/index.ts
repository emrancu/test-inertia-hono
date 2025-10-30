import {AuthManager, resolveAuth} from "./Auth";
import {SocialAuth} from "./SocialAuth";

/**
 * Unified Auth system that works with all guards (session and JWT)
 * Automatically detects and uses the appropriate driver based on guard configuration
 * 
 * Usage:
 * - Auth.guard('web').login(user) // Session-based login
 * - Auth.guard('api').login(user, { permissions: ['read', 'write'] }) // JWT-based login
 * - Auth.guard('web').user() // Get user from session
 * - Auth.guard('api').user() // Get user from JWT
 * - Auth.attempt(credentials) // Auto-detects guard based on route
 */
const Auth = {
    guard: (...args: Parameters<AuthManager['guard']>)=> {
        return resolveAuth().guard(...args);
    },
    logout: (...args: Parameters<AuthManager['logout']>)=> {
        return resolveAuth().logout(...args);
    },
    login:  (...args: Parameters<AuthManager['login']>)=> {
        return resolveAuth().login(...args);
    },
    attempt: (...args: Parameters<AuthManager['attempt']>)=> {
        return resolveAuth().attempt(...args);
    },
    user:  ()=> {
        return resolveAuth().user();
    },
    check: (...args: Parameters<AuthManager['check']>)=> {
        return resolveAuth().check(...args);
    }
};

export { Auth, SocialAuth };