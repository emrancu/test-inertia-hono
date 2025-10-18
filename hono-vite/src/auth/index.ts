import {JwtAuthManager, resolveJwtAuth} from "./ApiAuth";
import {AuthManager, resolveSessionAuth} from "./Auth";
import {SocialAuth} from "./SocialAuth";

const WebAuth = {
    guard: (...args: Parameters<AuthManager['guard']>)=> {
            return resolveSessionAuth().guard(...args);
    },
    logout: () => {
        return resolveSessionAuth().logout();
    },
    login:  (...args: Parameters<AuthManager['login']>)=> {
        return resolveSessionAuth().login(...args);
    },
    user:  ()=> {
        return resolveSessionAuth().user();
    },
    check: (...args: Parameters<AuthManager['check']>)=> {
        return resolveSessionAuth().check(...args);
    }
};

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


export { ApiAuth, WebAuth, SocialAuth };