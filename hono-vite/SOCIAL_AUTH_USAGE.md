# Social Auth with Guard-Based Authentication

The SocialAuth system now integrates seamlessly with the guard-based authentication system, supporting both session and JWT authentication.

## Features

- ✅ Works with all guards (session and JWT)
- ✅ Auto-detects guard based on route if not specified
- ✅ Custom user creation callbacks
- ✅ Supports token permissions for JWT guards
- ✅ Returns JWT token or boolean based on guard type

## Basic Usage

### 1. Redirect to OAuth Provider

```typescript
import { SocialAuth } from './src/auth';

// In your route handler
export async function loginWithGoogle(c: Context) {
  return SocialAuth.google().redirect();
}

export async function loginWithGithub(c: Context) {
  return SocialAuth.github().redirect();
}

export async function loginWithLinkedIn(c: Context) {
  return SocialAuth.linkedin().redirect();
}

export async function loginWithTwitter(c: Context) {
  return SocialAuth.x().redirect();
}
```

### 2. Handle OAuth Callback

#### Option A: Simple Login (Session-based)

```typescript
export async function googleCallback(c: Context) {
  // Get social user data and login with default web guard (session)
  const result = await SocialAuth.google().login();
  
  if (result) {
    return c.redirect('/dashboard');
  }
  
  return c.redirect('/login?error=auth_failed');
}
```

#### Option B: Login with Specific Guard

```typescript
// Login with session guard
export async function googleCallbackWeb(c: Context) {
  const result = await SocialAuth.google()
    .guard('web')
    .login({ remember: true });
  
  if (result) {
    return c.redirect('/dashboard');
  }
  
  return c.redirect('/login?error=auth_failed');
}

// Login with JWT guard (returns token)
export async function googleCallbackApi(c: Context) {
  const token = await SocialAuth.google()
    .guard('api')
    .login({ 
      permissions: ['read', 'write'],
      maxAge: '7d',
      tokenName: 'google_oauth_token'
    });
  
  if (typeof token === 'string') {
    return c.json({ token, success: true });
  }
  
  return c.json({ error: 'Authentication failed' }, 401);
}
```

#### Option C: Custom User Creation

```typescript
import { DB } from './src/database';
import { SocialAuth } from './src/auth';
import { sql } from 'drizzle-orm';

export async function googleCallback(c: Context) {
  const result = await SocialAuth.google()
    .guard('web')
    .login({
      createUserCallback: async (socialUser) => {
        // Check if user exists
        const existingUser = await DB().get(
          sql`SELECT * FROM users WHERE email = ${socialUser.email}`
        );
        
        if (existingUser) {
          return existingUser;
        }
        
        // Create new user
        await DB().run(sql`
          INSERT INTO users (name, email, avatar, provider_id, provider)
          VALUES (
            ${socialUser.name},
            ${socialUser.email},
            ${socialUser.avatar},
            ${socialUser.id},
            'google'
          )
        `);
        
        // Return the newly created user
        const newUser = await DB().get(
          sql`SELECT * FROM users WHERE email = ${socialUser.email}`
        );
        
        return newUser;
      }
    });
  
  if (result) {
    return c.redirect('/dashboard');
  }
  
  return c.redirect('/login?error=auth_failed');
}
```

## Advanced Examples

### Example 1: Multiple OAuth Providers with Custom Logic

```typescript
async function handleOAuthCallback(
  provider: 'google' | 'github' | 'linkedin' | 'x',
  c: Context
) {
  const socialProvider = {
    google: SocialAuth.google(),
    github: SocialAuth.github(),
    linkedin: SocialAuth.linkedin(),
    x: SocialAuth.x(),
  }[provider];
  
  const result = await socialProvider.guard('web').login({
    remember: true,
    createUserCallback: async (socialUser) => {
      // Find or create user
      let user = await DB().get(
        sql`SELECT * FROM users WHERE email = ${socialUser.email}`
      );
      
      if (!user) {
        // Create user
        await DB().run(sql`
          INSERT INTO users (name, email, avatar, provider, provider_id)
          VALUES (
            ${socialUser.name},
            ${socialUser.email || ''},
            ${socialUser.avatar},
            ${provider},
            ${socialUser.id}
          )
        `);
        
        user = await DB().get(
          sql`SELECT * FROM users WHERE email = ${socialUser.email}`
        );
      }
      
      // Update last login
      await DB().run(sql`
        UPDATE users 
        SET last_login = CURRENT_TIMESTAMP 
        WHERE id = ${user.id}
      `);
      
      return user;
    }
  });
  
  if (result) {
    return c.redirect('/dashboard');
  }
  
  return c.redirect('/login?error=auth_failed');
}
```

### Example 2: API OAuth with JWT Token

```typescript
export async function apiGoogleCallback(c: Context) {
  const token = await SocialAuth.google()
    .guard('api')
    .login({
      maxAge: '30d',
      tokenName: 'oauth_google_token',
      permissions: ['user:read', 'user:write', 'posts:read'],
      createUserCallback: async (socialUser) => {
        // Custom user logic...
        const user = await findOrCreateUser(socialUser);
        return user;
      }
    });
  
  if (typeof token === 'string') {
    return c.json({ 
      success: true,
      token,
      message: 'Successfully authenticated'
    });
  }
  
  return c.json({ 
    success: false,
    error: 'Authentication failed' 
  }, 401);
}
```

### Example 3: Get User Data Without Login

```typescript
export async function getGoogleUserInfo(c: Context) {
  try {
    // Just get the user data without logging in
    const socialUser = await SocialAuth.google().getUser();
    
    if (!socialUser) {
      return c.json({ error: 'Failed to get user data' }, 400);
    }
    
    return c.json({ 
      user: socialUser 
    });
  } catch (error) {
    return c.json({ error: error.message }, 400);
  }
}
```

### Example 4: Check Auth After Social Login

```typescript
import { Auth } from './src/auth';

export async function getDashboard(c: Context) {
  // Check if user is authenticated
  if (!Auth.guard('web').check()) {
    return c.redirect('/login');
  }
  
  // Get authenticated user
  const user = await Auth.guard('web').user();
  
  return c.json({ 
    user,
    message: 'Welcome to your dashboard!' 
  });
}
```

## Route Examples

### Web Routes (Session-based)

```typescript
// routes/web.tsx
import { SocialAuth } from '../src/auth';

// Redirect routes
app.get('/auth/google', (c) => SocialAuth.google().redirect());
app.get('/auth/github', (c) => SocialAuth.github().redirect());
app.get('/auth/linkedin', (c) => SocialAuth.linkedin().redirect());
app.get('/auth/x', (c) => SocialAuth.x().redirect());

// Callback routes
app.get('/auth/google/callback', async (c) => {
  const result = await SocialAuth.google()
    .guard('web')
    .login({ 
      remember: true,
      createUserCallback: async (socialUser) => {
        // Your user creation logic
        return await findOrCreateUser(socialUser);
      }
    });
  
  return result 
    ? c.redirect('/dashboard') 
    : c.redirect('/login?error=1');
});
```

### API Routes (JWT-based)

```typescript
// routes/api.ts
import { SocialAuth } from '../src/auth';

// Redirect routes
app.get('/api/auth/google', (c) => SocialAuth.google().redirect());
app.get('/api/auth/github', (c) => SocialAuth.github().redirect());

// Callback routes
app.get('/api/auth/google/callback', async (c) => {
  const token = await SocialAuth.google()
    .guard('api')
    .login({ 
      permissions: ['read', 'write'],
      maxAge: '7d',
      createUserCallback: async (socialUser) => {
        return await findOrCreateUser(socialUser);
      }
    });
  
  return typeof token === 'string'
    ? c.json({ token })
    : c.json({ error: 'Authentication failed' }, 401);
});
```

## SocialAuthUser Type

The `getUser()` method returns a `SocialAuthUser` object:

```typescript
type SocialAuthUser = {
  id: string;
  email?: string;
  name: string;
  username?: string;
  avatar: string;
};
```

## Login Options

The `login()` method accepts the following options:

```typescript
type LoginOptions = {
  // Specify which guard to use (optional)
  guard?: string;
  
  // Remember the user (session guards only)
  remember?: boolean;
  
  // Token max age (JWT guards)
  maxAge?: string | number; // e.g., "7d", "24h", 3600
  
  // Token name (JWT guards)
  tokenName?: string;
  
  // Token permissions (JWT guards)
  permissions?: string[];
  
  // Custom callback to find/create user
  createUserCallback?: (socialUser: SocialAuthUser) => Promise<any>;
};
```

## Best Practices

1. **Always use `createUserCallback`** to handle user creation/retrieval logic
2. **Handle errors properly** with try-catch blocks
3. **Validate social user data** before creating database records
4. **Use appropriate guards** - session for web, JWT for APIs
5. **Set proper token permissions** when using JWT guards
6. **Store provider information** (provider name, provider ID) for linking accounts

## Error Handling

```typescript
export async function googleCallback(c: Context) {
  try {
    const result = await SocialAuth.google()
      .guard('web')
      .login({
        createUserCallback: async (socialUser) => {
          if (!socialUser.email) {
            throw new Error('Email is required');
          }
          return await findOrCreateUser(socialUser);
        }
      });
    
    if (result) {
      return c.redirect('/dashboard');
    }
    
    return c.redirect('/login?error=auth_failed');
  } catch (error) {
    console.error('OAuth error:', error);
    return c.redirect('/login?error=server_error');
  }
}
```

## Summary

The updated SocialAuth system now:
- ✅ Integrates with the guard-based Auth system
- ✅ Supports both session and JWT authentication
- ✅ Allows custom user creation logic
- ✅ Auto-detects guard based on route context
- ✅ Returns appropriate values (token for JWT, boolean for session)
- ✅ Maintains backward compatibility with existing code


