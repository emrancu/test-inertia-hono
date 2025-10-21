import {JwtAuthManager, resolveJwtAuth} from "./ApiAuth";
import {AuthManager, resolveAuth, resolveSessionAuth} from "./Auth";
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

/**
 * WebAuth - Backward compatible, session-based authentication
 * Recommended to use Auth.guard('web') instead for better flexibility
 */
const WebAuth = {
    guard: (...args: Parameters<AuthManager['guard']>)=> {
        return resolveAuth().guard(...args);
    },
    logout: (...args: Parameters<AuthManager['logout']>)=> {
        return resolveAuth().logout();
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

/**
 * ApiAuth - Backward compatible, JWT-based authentication
 * Recommended to use Auth.guard('api') instead for better flexibility
 * 
 * Note: createToken method is still available for backward compatibility,
 * but Auth.guard('api').login() is recommended for new code
 */
const ApiAuth = {
    createToken: (...args: Parameters<JwtAuthManager['createToken']>)=> {
        return resolveJwtAuth().createToken(...args);
    },
    delete: () => {
        return resolveJwtAuth().delete();
    },
    user:   (...args: Parameters<JwtAuthManager['user']>)=> {
        return resolveJwtAuth().user(...args);
    },
    check: (...args: Parameters<JwtAuthManager['check']>)=> {
        return resolveJwtAuth().check(...args);
    }
};


export { Auth, ApiAuth, WebAuth, SocialAuth };