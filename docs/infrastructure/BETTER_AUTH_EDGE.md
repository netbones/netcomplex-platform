# Better Auth Vercel Edge Runtime Research

## Summary

**Better Auth CAN run in Edge runtime with limitations.** Core session/cookie management works, but database operations require Node.js **unless using Drizzle**.

## Key Findings

### ✅ What Works in Edge Runtime

- Cookie and session management via `getSessionCookie` and `getCookieCache`
- Session cookie caching (Web Standard APIs only)
- OAuth flow redirects
- Dynamic base URL resolution with `allowedHosts`
- **Drizzle ORM** - Fully supports Edge runtime with Vercel Edge Functions

### ❌ What Requires Node.js Runtime

- **Prisma** - Requires Node.js (doesn't support Edge)
- `validateUser` function
- Signed cookies
- Session validation (full auth checks)

### 🟡 Drizzle is Edge-Ready

If we migrate to Drizzle ORM, the entire stack could run on Edge:

- Drizzle supports Vercel Edge Functions natively
- Better Auth can use Drizzle adapter
- Faster cold starts, lower costs

## Configuration for Vercel

### 1. Dynamic Base URL (Required for Vercel)

```typescript
// src/lib/auth.ts
export const auth = betterAuth({
  baseURL: {
    allowedHosts: [
      'soralia-village.com', // Production
      'www.soralia-village.com', // WWW variant
      '*.vercel.app', // All preview deployments
      'localhost:3000', // Local dev
    ],
  },
});
```

### 2. Background Tasks (Optional but Recommended)

```typescript
import { waitUntil } from '@vercel/functions';

export const auth = betterAuth({
  advanced: {
    backgroundTasks: {
      handler: waitUntil,
    },
  },
});
```

### 3. Middleware Auth Check (Edge-compatible)

```typescript
// middleware.ts
import { getSessionCookie } from 'better-auth/cookies';

export async function middleware(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL('/sign-in', request.url));
  }
  return NextResponse.next();
}
```

**⚠️ Security Warning**: `getSessionCookie` only checks cookie existence, not validity. Use for redirects only, not protection.

## Implementation Strategy

### Option 1: Hybrid Middleware (Recommended)

- Use Edge runtime for middleware with fast cookie check
- Keep API routes in Node.js runtime for full auth

```typescript
// src/app/api/auth/[...all]/route.ts
export const runtime = 'nodejs'; // Required for DB operations
```

### Option 2: Full Node.js (Simpler)

- Keep everything in Node.js runtime
- Use `backgroundTasks` with `waitUntil` for performance

## Current Status

- **Current**: All API routes use default Node.js runtime ✅
- **Migration**: Not critical - Node.js works fine on Vercel
- **Benefits of Edge**: Faster cold starts, lower costs
- **Recommendation**: Can be deferred until cold start becomes an issue

## References

- [Dynamic Base URL Docs](https://better-auth.com/docs/concepts/dynamic-base-url)
- [Next.js Integration](https://better-auth.com/docs/integrations/next)
- [Edge Runtime Discussion](https://github.com/better-auth/better-auth/discussions/4342)
- [Edge Runtime Issue #1309](https://github.com/better-auth/better-auth/issues/1309)
