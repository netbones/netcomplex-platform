# Registration Flow Documentation

> **Last updated:** 2026-05-17
> **Status:** Documenting existing flows before building third-party registration (69c)

---

## Overview

The platform supports multiple registration paths across two distinct contexts:

| Context                   | Base Path              | Audience                 | Purpose                         |
| ------------------------- | ---------------------- | ------------------------ | ------------------------------- |
| **Tenant Portal**         | `/sign-up`, `/sign-in` | Community residents      | Join an existing community      |
| **Platform (NetComplex)** | `/signup`, `/login`    | Community administrators | Create a new tenant (community) |

All flows use **Better Auth** as the authentication backbone with email/password as the primary method, passkey support, and 2FA capability.

---

## Flow 1: Resident Signup (Single-Tenant)

**Purpose:** Existing community residents create accounts within their tenant's community portal.

### Entry Points

- **URL:** `/sign-up`
- **Component:** `src/app/(auth)/sign-up/page.tsx`
- **API:** `POST /api/auth/signup`

### Flow Diagram

```
/sign-up
  │
  ├─ User fills: Name, Email, Password (min 8 chars)
  ├─ Honeypot field rendered (bot protection)
  ├─ Turnstile captcha validated (if configured)
  │
  ▼
POST /api/auth/signup
  │
  ├─ Validates required fields (email, password, name)
  ├─ Verifies Turnstile token (if provided)
  ├─ Proxies to Better Auth: POST /api/auth/sign-up/email
  ├─ On success: sends welcome email (non-blocking)
  │
  ▼
Redirect: /verify-email?email=<email>
  │
  ├─ User clicks verification link in email
  ├─ Better Auth sets emailVerified=true
  ├─ autoSignInAfterVerification: true → user signed in
  │
  ▼
Redirect: /dashboard
```

### Database Tables Affected

| Table          | Action | Notes                                                      |
| -------------- | ------ | ---------------------------------------------------------- |
| `user`         | Insert | `role=RESIDENT`, `tenantId=default`, `emailVerified=false` |
| `user`         | Update | `profileSlug` auto-generated via `databaseHooks`           |
| `verification` | Insert | Email verification token (1-hour expiry)                   |
| `account`      | Insert | Email/password provider record                             |

### Auth State Changes

- User created but **NOT signed in** initially
- `emailVerified: false` until verification link clicked
- After verification: auto sign-in, session cookie set

### Email Notifications

| Email          | Trigger                       | Template                  |
| -------------- | ----------------------------- | ------------------------- |
| Verification   | Signup success                | `templates.verifyEmail`   |
| Welcome        | Signup success (non-blocking) | `templates.welcome`       |
| Security Alert | Signup with existing email    | `templates.securityAlert` |

### Better Auth Configuration

```
requireEmailVerification: true
sendOnSignIn: true
autoSignInAfterVerification: true
```

### Key Files

- `src/app/(auth)/sign-up/page.tsx` — Signup form
- `src/app/api/auth/signup/route.ts` — API wrapper
- `src/shared/api/auth.ts` — Better Auth config
- `src/shared/api/email/templates.ts` — Email templates

---

## Flow 2: Platform Tenant Creation (NetComplex)

**Purpose:** New community administrators create a tenant (community) on the NetComplex platform.

### Entry Points

- **URL:** `/signup`
- **Component:** `src/app/(platform)/signup/page.tsx`
- **Hook:** `src/features/auth/model/useSignupForm.ts`
- **API:** `POST /api/platform/tenants`

### Flow Diagram

```
/signup
  │
  ├─ Step 1: Community Details
  │   ├─ Community Name (e.g., "Soralia Village HOA")
  │   ├─ Subdomain (e.g., "soralia" → soralia.netbones.co.za)
  │   └─ Plan selection (foundation/depth/core)
  │
  ├─ Step 2: Admin Personal Details
  │   ├─ First Name, Last Name
  │   ├─ Email Address
  │   └─ Phone Number (optional)
  │
  ├─ Step 3: Create Account
  │   ├─ Password (min 8 chars, uppercase, lowercase, number)
  │   ├─ Confirm Password
  │   └─ Summary review
  │
  ▼
POST /api/platform/tenants
  │
  ├─ Creates admin user via Better Auth
  ├─ Creates tenant record (atomic transaction)
  ├─ Links user to tenant (tenantId, role=ADMIN)
  ├─ Transaction safety: if tenant fails, user is deleted
  │
  ▼
Redirect: /platform/onboarding/[tenantId]
```

### Database Tables Affected

| Table          | Action | Notes                                    |
| -------------- | ------ | ---------------------------------------- |
| `user`         | Insert | Admin user via Better Auth               |
| `tenants`      | Insert | New tenant with slug, tier, featureFlags |
| `user`         | Update | Linked to tenant, role=ADMIN             |
| `verification` | Insert | Email verification token                 |

### Transaction Safety

```
1. Create user via Better Auth
2. Create tenant record
3. Link user to tenant
4. If ANY step fails → delete user (rollback)
```

### Email Notifications

| Email        | Trigger        | Template                |
| ------------ | -------------- | ----------------------- |
| Verification | Signup success | `templates.verifyEmail` |
| Welcome      | ❌ NOT sent    | —                       |

### Key Files

- `src/app/(platform)/signup/page.tsx` — 3-step wizard
- `src/features/auth/model/useSignupForm.ts` — Form state management
- `src/app/api/platform/tenants/route.ts` — Tenant creation API
- `src/app/api/pricing/route.ts` — Plan fetching

### Validation (Zod)

- Subdomain: lowercase alphanumeric + hyphens, 3-50 chars
- Password: min 8 chars, uppercase + lowercase + number required
- Plan: enum `['foundation', 'depth', 'core']`

---

## Flow 3: Tenant Onboarding Wizard

**Purpose:** New tenant administrators configure their community after signup.

### Entry Points

- **URL:** `/platform/onboarding/[tenantId]`
- **Page:** `src/app/(platform)/onboarding/[tenantId]/page.tsx`
- **Wizard:** `src/features/onboarding/ui/OnboardingWizard.tsx`
- **State:** `src/features/onboarding/model/useOnboarding.ts`
- **API:** `POST /api/platform/onboarding`

### Flow Diagram

```
/platform/onboarding/[tenantId]
  │
  ├─ Step 1: Branding (NOT skippable)
  │   ├─ Logo upload (PNG/JPEG, max 2MB)
  │   ├─ Primary color picker (default: #4F46E5)
  │   ├─ Accent color picker
  │   └─ Font family selector
  │
  ├─ Step 2: Modules (skippable)
  │   ├─ Toggle modules on/off (tier-based access)
  │   └─ Premium modules shown as upsell
  │
  ├─ Step 3: Pages (NOT skippable)
  │   ├─ Toggle page visibility
  │   └─ Default: News, Directory, Events, Campaign ON; Chat OFF
  │
  ├─ Step 4: Invite Team (skippable)
  │   ├─ Add co-administrators via email
  │   ├─ Role options: ADMIN, MANAGER, BOARD
  │   └─ Creates invitation records
  │
  └─ Step 5: Launch (NOT skippable)
      ├─ Success confirmation
      ├─ Links to Admin Panel + Public Site
      └─ Sets onboarding_completed flag
  │
  ▼
Redirect: /admin
```

### Database Tables Affected

| Table        | Action        | Notes                                           |
| ------------ | ------------- | ----------------------------------------------- |
| `setting`    | Insert/Update | Onboarding progress as key-value pairs          |
| `invitation` | Insert        | Team member invitations (PENDING, 7-day expiry) |

### Settings Keys

| Key                    | Content                  |
| ---------------------- | ------------------------ |
| `onboarding_step_1`    | Branding data (JSON)     |
| `onboarding_step_2`    | Module selections (JSON) |
| `onboarding_step_3`    | Page visibility (JSON)   |
| `onboarding_step_4`    | Invite list (JSON)       |
| `onboarding_step_5`    | Completion flag          |
| `onboarding_completed` | `'true'` when finished   |

### Email Notifications

| Email      | Trigger       | Status                             |
| ---------- | ------------- | ---------------------------------- |
| Invitation | Step 4 invite | ❌ NOT sent (records created only) |

### Key Files

- `src/app/(platform)/onboarding/[tenantId]/page.tsx` — Onboarding page
- `src/features/onboarding/ui/OnboardingWizard.tsx` — Wizard component
- `src/features/onboarding/model/useOnboarding.ts` — State hook
- `src/features/onboarding/ui/steps/InviteStep.tsx` — Invite step
- `src/app/api/platform/onboarding/route.ts` — Save step data
- `src/app/api/invitations/route.ts` — Create invitations

---

## Flow 4: Email Verification

**Purpose:** Verify user email address before allowing sign-in.

### Entry Points

- **URL:** `/verify-email`
- **Component:** `src/app/(auth)/verify-email/page.tsx`

### Flow Diagram

```
/verify-email
  │
  ├─ Email pre-filled from URL query parameter
  ├─ User can resend verification email
  │
  ▼
authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' })
  │
  ├─ Better Auth generates new verification token
  ├─ Sends verification email
  │
  ▼
User clicks link in email
  │
  ├─ emailVerified: false → true
  ├─ autoSignInAfterVerification: true → session created
  │
  ▼
Redirect: /dashboard
```

### Database Tables Affected

| Table          | Action | Notes                  |
| -------------- | ------ | ---------------------- |
| `verification` | Insert | New verification token |
| `user`         | Update | `emailVerified=true`   |

### Key Files

- `src/app/(auth)/verify-email/page.tsx` — Verification page
- `src/shared/api/auth.ts` — Better Auth email config

---

## Flow 5: Password Reset

**Purpose:** Users reset forgotten passwords.

### Entry Points

- **Request:** `/forgot-password`
- **Complete:** `/reset-password?token=<token>&email=<email>`

### Flow Diagram

```
/forgot-password
  │
  ├─ User enters email
  ├─ Turnstile captcha validated
  │
  ▼
POST /api/auth/forgot-password
  │
  ├─ Checks if user exists
  ├─ Generates UUID reset token
  ├─ Stores in verification table (identifier: 'password-reset')
  ├─ Sends password reset email
  └─ Always returns success (email enumeration protection)
  │
  ▼
User clicks link → /reset-password?token=<token>&email=<email>
  │
  ├─ Enters new password (min 8 chars) + confirmation
  ├─ Turnstile captcha validated
  │
  ▼
POST /api/auth/reset-password
  │
  ├─ Verifies token exists, not expired, matches email
  ├─ Proxies to Better Auth /api/auth/reset-password
  ├─ Deletes used verification token
  │
  ▼
Redirect: /sign-in
```

### Database Tables Affected

| Table          | Action | Notes                                 |
| -------------- | ------ | ------------------------------------- |
| `verification` | Insert | Reset token (1-hour expiry)           |
| `verification` | Delete | Token removed after use               |
| `user`         | Update | Password hash updated via Better Auth |

### Email Notifications

| Email          | Trigger                 | Template                  |
| -------------- | ----------------------- | ------------------------- |
| Password Reset | Forgot password request | `templates.passwordReset` |

### Key Files

- `src/app/(auth)/forgot-password/page.tsx` — Request form
- `src/app/(auth)/reset-password/page.tsx` — Reset form
- `src/app/api/auth/forgot-password/route.ts` — Request API
- `src/app/api/auth/reset-password/route.ts` — Reset API

---

## Flow 6: Sign-In (Two Paths)

**Purpose:** Authenticate existing users.

### Tenant Sign-In (`/sign-in`)

```
/sign-in
  │
  ├─ User enters email + password
  ├─ Turnstile captcha validated
  │
  ▼
POST /api/auth/signin
  │
  ├─ Verifies Turnstile token
  ├─ Proxies to Better Auth /api/auth/sign-in/email
  ├─ If email not verified: returns 403, shows resend link
  │
  ▼
On success: session cookie set → /dashboard
```

### Platform Sign-In (`/login`)

```
/login
  │
  ├─ User enters email + password
  │
  ▼
Direct to Better Auth /api/auth/sign-in/email
  │
  ▼
On success: /admin/platform
```

### Database Tables Affected

| Table     | Action | Notes                   |
| --------- | ------ | ----------------------- |
| `session` | Insert | New session record      |
| `user`    | Read   | `emailVerified` checked |

### Email Notifications

| Email        | Trigger                                              | Template                |
| ------------ | ---------------------------------------------------- | ----------------------- |
| Verification | Sign-in with unverified email (`sendOnSignIn: true`) | `templates.verifyEmail` |

### Key Files

- `src/app/(auth)/sign-in/page.tsx` — Tenant sign-in
- `src/app/(platform)/login/page.tsx` — Platform login
- `src/app/api/auth/signin/route.ts` — Tenant sign-in API

---

## Flow 7: Team Invitations (During Onboarding)

**Purpose:** Tenant admins invite co-administrators/board members.

### Entry Points

- **Component:** `src/features/onboarding/ui/steps/InviteStep.tsx`
- **Trigger:** Onboarding Wizard Step 4
- **API:** `POST /api/invitations`

### Flow Diagram

```
Onboarding Step 4: Invite Team
  │
  ├─ Admin enters email + selects role (ADMIN/MANAGER/BOARD)
  ├─ Clicks "Add" to add to invite list
  ├─ Can add multiple invites
  │
  ▼
POST /api/invitations (for each invite)
  │
  ├─ Creates invitation record (PENDING, 7-day expiry)
  └─ ⚠️ NO email sent
  │
  ▼
Invitations stored in database
  │
  └─ ⚠️ NO acceptance flow implemented
```

### Database Tables Affected

| Table        | Action | Notes                                      |
| ------------ | ------ | ------------------------------------------ |
| `invitation` | Insert | PENDING status, 7-day expiry, unique token |

### Invitation Record Structure

```
{
  id: UUID,
  email: string (unique),
  name: string (derived from email),
  role: 'ADMIN' | 'MANAGER' | 'BOARD',
  residentType: 'OWNER' (default),
  token: UUID (unique),
  status: 'PENDING',
  expiresAt: 7 days from creation,
  tenantId: current tenant,
  inviterId: current user,
  organizationId: placeholder (not wired)
}
```

### ⚠️ Known Gaps

1. **No invitation acceptance flow** — Records created but nothing to accept them
2. **No invitation emails sent** — API creates records but doesn't send emails
3. **No token-based signup** — Invitees can't use token to complete registration

### Key Files

- `src/features/onboarding/ui/steps/InviteStep.tsx` — Invite UI
- `src/app/api/invitations/route.ts` — Create invitation
- `src/app/api/invitations/[id]/route.ts` — Cancel invitation

---

## Better Auth Configuration

**File:** `src/shared/api/auth.ts`

### Plugins Enabled

| Plugin         | Purpose                            |
| -------------- | ---------------------------------- |
| `twoFactor`    | 2FA with issuer from tenant config |
| `organization` | Multi-organization support         |
| `bearer`       | Bearer token authentication        |
| `passkey`      | WebAuthn/passkey authentication    |

### Database Schema (Drizzle Adapter)

| Better Auth Table | Drizzle Table   |
| ----------------- | --------------- |
| `user`            | `users`         |
| `session`         | `sessions`      |
| `account`         | `accounts`      |
| `verification`    | `verifications` |
| `passkey`         | `passkeys`      |
| `twoFactor`       | `twoFactors`    |
| `member`          | `members`       |
| `invitation`      | `invitations`   |
| `organization`    | `organizations` |

### User Additional Fields

| Field             | Type   | Required | Default                    | Notes                         |
| ----------------- | ------ | -------- | -------------------------- | ----------------------------- |
| `tenantId`        | string | Yes      | `tenantConfig.defaultSlug` | Auto-set, users cannot change |
| `dashboardLayout` | string | No       | —                          | Managed by application        |
| `profileSlug`     | string | No       | Auto-generated             | Generated on signup from name |

### Email Configuration

| Setting                       | Value  |
| ----------------------------- | ------ |
| `requireEmailVerification`    | `true` |
| `sendOnSignIn`                | `true` |
| `autoSignInAfterVerification` | `true` |

### Database Hooks

| Hook                 | Action                                      |
| -------------------- | ------------------------------------------- |
| `user.create.before` | Auto-generates `profileSlug` from user name |

### Callbacks

| Callback                                   | Action                     |
| ------------------------------------------ | -------------------------- |
| `emailAndPassword.onExistingUserSignUp`    | Sends security alert email |
| `emailVerification.afterEmailVerification` | Logs verification event    |

---

## Third-Party Registration (69c) — NOT IMPLEMENTED

### Current State

- **No OAuth/social providers** configured in Better Auth
- **No third-party/provider role** exists (current: RESIDENT, ADMIN, BOARD, MANAGER)
- **No provider onboarding** flow (platform onboarding is for tenant admins only)
- **No tenant linking** for external users

### Prerequisites Before Building

1. Define third-party role (e.g., `PROVIDER`, `CONTRACTOR`, `VENDOR`)
2. Decide auth method: email/password, OAuth, or both
3. Design provider onboarding flow (different from tenant onboarding)
4. Implement invitation acceptance flow (Flow 7 gap)
5. Determine how providers link to specific tenants
6. Design provider profile/schema (services offered, verification status, etc.)

---

## Flow Comparison Matrix

| Aspect                 | Resident (Flow 1)   | Platform Tenant (Flow 2)    | Third Party (69c)  |
| ---------------------- | ------------------- | --------------------------- | ------------------ |
| **Entry URL**          | `/sign-up`          | `/signup`                   | ❌ Not implemented |
| **Role**               | RESIDENT            | ADMIN                       | ???                |
| **Tenant Assignment**  | Auto (default slug) | Creates new tenant          | Needs linking      |
| **Verification**       | Required            | Required                    | ???                |
| **Onboarding**         | None                | 5-step wizard               | ???                |
| **Welcome Email**      | ✅ Yes              | ❌ No                       | ???                |
| **Turnstile**          | ✅ Yes              | ❌ No                       | ???                |
| **Honeypot**           | ✅ Yes              | ❌ No                       | ???                |
| **Post-Flow Redirect** | `/dashboard`        | `/platform/onboarding/[id]` | ???                |

---

## Email Template Reference

| Template        | Subject                               | Triggered By                         |
| --------------- | ------------------------------------- | ------------------------------------ |
| `verifyEmail`   | "Verify your Soralia Village email"   | Signup, sign-in (unverified), resend |
| `welcome`       | "Welcome to Soralia Village!"         | Resident signup success              |
| `passwordReset` | "Reset your Soralia Village password" | Forgot password request              |
| `securityAlert` | "Security Alert"                      | Signup with existing email           |

All templates defined in `src/shared/api/email/templates.ts`.
