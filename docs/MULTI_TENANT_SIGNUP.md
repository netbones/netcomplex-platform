# Multi-Tenant Sign-Up Options

This document outlines approaches for handling user sign-up in a multi-tenant SaaS platform where each tenant needs isolated data.

---

## The Problem

When using shared-database multi-tenancy with `tenantId` on every table, you must determine which tenant a new user belongs to during sign-up. Without this, you get:

```
ERROR: null value in column "tenantId" violates not-null constraint
```

---

## Sign-Up Approaches

### Option 1: Invite-Based Sign-Up (Recommended)

Users receive an invite link containing the tenant context.

**How it works:**

1. Admin creates user via Better Auth Admin API with explicit `tenantId`
2. System sends invite email with link: `https://app.com/sign-up?invite_code=xxx`
3. Sign-up form validates invite code, extracts tenant, creates user

**Implementation:**

```typescript
// Sign-up page reads invite code
const { searchParams } = new URL(request.url);
const inviteCode = searchParams.get('invite_code');

// Validate invite, get tenant info
const invite = await db.select().from(invitations).where(eq(invitations.code, inviteCode));

// Create user with tenant from invite
await auth.api.signUpEmail({
  body: {
    email,
    password,
    name,
    // Can inject via databaseHooks or additionalFields
    tenantId: invite.tenantId,
  },
});
```

**Pros:**

- Secure — no tenant guessing
- Controlled onboarding
- Can pre-set user role/permissions

**Cons:**

- Requires invite workflow first
- More administrative overhead

---

### Option 2: Subdomain-Based Sign-Up

Tenant is determined from the URL subdomain.

**How it works:**

1. User visits `https://tenant1.example.com/sign-up`
2. Middleware extracts subdomain, resolves tenant
3. Sign-up includes tenant context automatically

**Middleware:**

```typescript
// middleware.ts
export async function middleware(req: NextRequest) {
  const host = req.headers.get('host') || '';
  const subdomain = host.split('.')[0]; // 'tenant1' from 'tenant1.example.com'

  const tenant = await getTenantBySlug(subdomain);

  const response = NextResponse.next();
  if (tenant) {
    response.headers.set('x-tenant-id', tenant.id);
  }
  return response;
}
```

**Sign-up API:**

```typescript
export async function POST(request: Request) {
  const headersList = await headers();
  const tenantId = headersList.get('x-tenant-id');

  if (!tenantId) {
    return NextResponse.json({ error: 'Invalid tenant' }, { status: 400 });
  }

  // Sign up user with tenant context
  await auth.api.signUpEmail({
    body: { email, password, name, tenantId },
  });
}
```

**Pros:**

- Seamless UX — no invite needed
- Works for self-service sign-up
- Scalable

**Cons:**

- Requires subdomain DNS setup
- Can't use same email across tenants (handle via tenant-scoped uniqueness)

---

### Option 3: Admin-Created Users

Admin creates users via Better Auth Admin API, user then sets password.

**How it works:**

1. Admin calls `auth.api.createUser({ body: { email, name, tenantId } })`
2. User receives email with set-password link
3. User completes signup by setting password

**Implementation:**

```typescript
// Admin creates user
await auth.api.createUser({
  headers: request.headers,
  body: {
    email: 'user@tenant.com',
    name: 'John Doe',
    tenantId: 'tenant-123',
    // Custom fields via data property
    data: { tenantId: 'tenant-123' },
  },
});
```

**Pros:**

- Full control over tenant assignment
- No guessable tenant context

**Cons:**

- Manual process for each user
- Not suitable for self-service

---

### Option 4: Tenant Selection on Sign-Up

Add a dropdown to the sign-up form.

**Implementation:**

```typescript
// Sign-up form
<select name="tenantId">
  <option value="tenant-1">Acme Corp</option>
  <option value="tenant-2">Globex Inc</option>
</select>
```

**Pros:**

- Simple to implement

**Cons:**

- **Security risk** — users can guess tenant IDs
- Poor UX — users may not know which tenant to select
- Not recommended for production

---

### Option 5: Default + Manual Migration (Current Approach)

Uses Better Auth's `additionalFields` with a hardcoded default, then migrates users manually or via support.

**Current implementation:**

```typescript
// auth.ts
export const auth = betterAuth({
  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: true,
        defaultValue: 'soralia', // Default for single-tenant mode
        input: false,
      },
    },
  },
});
```

**Pros:**

- Quick to implement for single-tenant MVP

**Cons:**

- Doesn't scale to multi-tenant
- All users assigned to default tenant

**When to use:**

- MVP with single tenant (Soralia Village)
- When you'll migrate to proper solution later

---

## Comparison Matrix

| Approach              | Security | UX       | Setup Effort | Scalability |
| --------------------- | -------- | -------- | ------------ | ----------- |
| **Invite-based**      | ✅ High  | Good     | Medium       | ✅ High     |
| **Subdomain**         | ✅ High  | ✅ Great | Medium       | ✅ High     |
| **Admin-created**     | ✅ High  | Poor     | Low          | Medium      |
| **Tenant selection**  | ❌ Low   | Poor     | Low          | ❌ Low      |
| **Default (current)** | ❌ Low   | ✅ Great | ✅ Minimal   | ❌ None     |

---

## Recommended Path for NetComplex

**Phase 1 (Current):** Default tenantId — works for Soralia Village

**Phase 2:** Invite-based — admin creates users for each tenant

**Phase 3:** Subdomain-based — enable self-service with custom domains

---

## Implementation Checklist

For subdomain-based sign-up:

- [ ] Ensure middleware extracts tenant from subdomain
- [ ] Add `x-tenant-id` header for API routes
- [ ] Update sign-up form to read tenant from headers
- [ ] Handle email uniqueness per tenant (not global)
- [ ] Test with local subdomain (e.g., `soralia.localhost:3000`)
- [ ] Configure DNS/wildcard domain in Vercel

---

## Related Documents

- [MULTI_TENANT.md](./MULTI_TENANT.md) — Full multi-tenant architecture guide
- [TENANT_AUDIT.md](./TENANT_AUDIT.md) — Tenant audit and migration
- [Better Auth documentation](https://better-auth.com) — Auth configuration
