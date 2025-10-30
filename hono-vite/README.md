```txt
npm install
npm run dev
```

```txt
npm run deploy
```

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```txt
npm run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>()
```

---

## Social Auth

The framework provides built-in OAuth authentication for Google, GitHub, LinkedIn, and X (Twitter). After retrieving user data from social providers, you can seamlessly integrate with the Auth system to create authenticated sessions.

### Configuration

Configure your OAuth providers in `config/social-auth.ts`:

```ts
import { SocialAuth } from "../src/type-declaration";

export const socialAuth: SocialAuth = {
  google: {
    clientId: "YOUR_GOOGLE_CLIENT_ID",
    clientSecret: "YOUR_GOOGLE_CLIENT_SECRET",
    redirectPath: "/auth/google/callback",
  },
  github: {
    clientId: "YOUR_GITHUB_CLIENT_ID",
    clientSecret: "YOUR_GITHUB_CLIENT_SECRET",
    redirectPath: "/auth/github/callback",
    scopes: ["read:user", "user:email"],
    oauthApp: false, // Set to true for OAuth Apps, false for GitHub Apps
  },
  linkedin: {
    clientId: "YOUR_LINKEDIN_CLIENT_ID",
    clientSecret: "YOUR_LINKEDIN_CLIENT_SECRET",
    redirectPath: "/auth/linkedin/callback",
    scopes: ["email", "openid", "profile"],
  },
  x: {
    clientId: "YOUR_X_CLIENT_ID",
    clientSecret: "YOUR_X_CLIENT_SECRET",
    redirectPath: "/auth/x/callback",
    scopes: ["tweet.read", "users.read"],
  },
};
```

### Usage

#### Google Authentication

```ts
import { SocialAuth } from "../src/auth";
import { Auth } from "../src/auth";

// Redirect to Google OAuth
Route.get("/auth/google", async () => {
  return SocialAuth.google().redirect();
});

// Handle callback and login
Route.get("/auth/google/callback", async () => {
  const socialUser = await SocialAuth.google().getUser();
  
  if (!socialUser) {
    throw new Error("Failed to get user from Google");
  }

  // Find or create user in your database
  const user = await findOrCreateUser({
    email: socialUser.email,
    name: socialUser.name,
    avatar: socialUser.avatar,
    provider: "google",
    providerId: socialUser.id,
  });

  // Login with Auth system (session-based or JWT)
  await Auth.login(user);

  // Redirect to dashboard or home
  return c.redirect("/dashboard");
});
```

#### GitHub Authentication

```ts
// Redirect to GitHub OAuth
Route.get("/auth/github", async () => {
  return SocialAuth.github().redirect();
});

// Handle callback
Route.get("/auth/github/callback", async () => {
  const socialUser = await SocialAuth.github().getUser();
  
  if (!socialUser) {
    throw new Error("Failed to get user from GitHub");
  }

  const user = await findOrCreateUser({
    email: socialUser.email,
    name: socialUser.name,
    username: socialUser.username,
    avatar: socialUser.avatar,
    provider: "github",
    providerId: socialUser.id,
  });

  await Auth.login(user);
  return c.redirect("/dashboard");
});
```

#### LinkedIn Authentication

```ts
// Redirect to LinkedIn OAuth
Route.get("/auth/linkedin", async () => {
  return SocialAuth.linkedin().redirect();
});

// Handle callback
Route.get("/auth/linkedin/callback", async () => {
  const socialUser = await SocialAuth.linkedin().getUser();
  
  if (!socialUser) {
    throw new Error("Failed to get user from LinkedIn");
  }

  const user = await findOrCreateUser({
    email: socialUser.email,
    name: socialUser.name,
    avatar: socialUser.avatar,
    provider: "linkedin",
    providerId: socialUser.id,
  });

  await Auth.login(user);
  return c.redirect("/dashboard");
});
```

#### X (Twitter) Authentication

```ts
// Redirect to X OAuth
Route.get("/auth/x", async () => {
  return SocialAuth.x().redirect();
});

// Handle callback
Route.get("/auth/x/callback", async () => {
  const socialUser = await SocialAuth.x().getUser();
  
  if (!socialUser) {
    throw new Error("Failed to get user from X");
  }

  const user = await findOrCreateUser({
    name: socialUser.name,
    username: socialUser.username,
    avatar: socialUser.avatar,
    provider: "x",
    providerId: socialUser.id,
  });

  await Auth.login(user);
  return c.redirect("/dashboard");
});
```

### Social Auth User Type

The `getUser()` method returns a `SocialAuthUser` object with the following structure:

```ts
type SocialAuthUser = {
  id: string;           // Provider's user ID
  email?: string;       // User's email (may not be available for all providers)
  name: string;         // User's display name
  username?: string;    // Username (available for GitHub, X)
  avatar: string;       // Profile picture URL
};
```

### Integration with Auth System

After retrieving the social user data, you can seamlessly integrate with the authentication system:

#### Session-based Authentication (Web Guard)

```ts
Route.get("/auth/google/callback", async () => {
  const socialUser = await SocialAuth.google().getUser();
  
  // Your user creation/retrieval logic
  const user = await getUserFromDatabase(socialUser);

  // Login with web guard (session-based)
  await Auth.guard("web").login(user, { remember: true });
  
  return c.redirect("/dashboard");
});
```

#### JWT Authentication (API Guard)

```ts
Route.get("/auth/github/callback", async () => {
  const socialUser = await SocialAuth.github().getUser();
  
  const user = await getUserFromDatabase(socialUser);

  // Login with API guard (JWT)
  const token = await Auth.guard("api").login(user, {
    maxAge: "7d",
    tokenName: "github_auth",
    permissions: ["read", "write"],
  });

  // Return token or set it in cookie (based on guard config)
  return c.json({ token, user });
});
```

### Example: Complete Social Auth Flow

```ts
import { sql } from "drizzle-orm";
import { DB } from "../src/database";
import { SocialAuth, Auth } from "../src/auth";

async function findOrCreateUser(socialUser: SocialAuthUser, provider: string) {
  // Check if user exists by provider ID
  let user = await DB().get(
    sql`SELECT * FROM users WHERE provider = ${provider} AND provider_id = ${socialUser.id}`
  );

  if (!user) {
    // Create new user
    const result = await DB().run(
      sql`INSERT INTO users (name, email, username, avatar, provider, provider_id, created_at) 
          VALUES (${socialUser.name}, ${socialUser.email}, ${socialUser.username}, 
                  ${socialUser.avatar}, ${provider}, ${socialUser.id}, ${Date.now()})`
    );
    
    user = await DB().get(
      sql`SELECT * FROM users WHERE id = ${result.meta.last_row_id}`
    );
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
  };
}

// Google OAuth Routes
Route.get("/auth/google", () => SocialAuth.google().redirect());

Route.get("/auth/google/callback", async (c) => {
  const socialUser = await SocialAuth.google().getUser();
  
  if (!socialUser) {
    return c.redirect("/login?error=auth_failed");
  }

  const user = await findOrCreateUser(socialUser, "google");
  await Auth.login(user, { remember: true });

  return c.redirect("/dashboard");
});
```

### Security Notes

- All OAuth flows use state parameters to prevent CSRF attacks
- State is stored in session and validated on callback
- Session data is automatically cleaned up after token exchange
- X (Twitter) OAuth uses PKCE (Proof Key for Code Exchange) for enhanced security
- Always validate and sanitize user data before storing in your database
- Store OAuth tokens securely if you need to access provider APIs later

---

## Documentation

- [R2 File Manager](./docs/filemanager.md) - Complete guide for file uploads, downloads, and management using Cloudflare R2
