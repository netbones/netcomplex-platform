COMPREHENSIVE REGISTRATION/SIGNUP FLOW MAP
Email Notifications Sent
Post-Registration Actions

- Redirect to /verify-email page
- User must click verification link in email
- After verification: autoSignInAfterVerification: true (auto sign-in)
- After verification: afterEmailVerification hook logs the event
- User redirected to /dashboard (callbackURL from verify-email page)
  Step 1: Community Details
- Community Name (e.g., "Soralia Village HOA")
- Subdomain (e.g., "soralia" -> soralia.netbones.co.za)
- Plan selection (foundation/core/pro-max) - fetched from GET /api/pricing
  Step 2: Admin Personal Details
- First Name, Last Name
- Email Address
- Phone Number (optional)
  Step 3: Create Account
- Password (min 8 chars, must contain uppercase, lowercase, number)
- Confirm Password
- Summary review of all entered data
  Auth State Changes
  FLOW 3: Tenant Onboarding Wizard
  Entry Points
- URL: /platform/onboarding/[tenantId]
- Page: /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/onboarding/[tenantId]/page.tsx
- Layout: /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/onboarding/layout.tsx
- Wizard Component: /home/ubuntupunk/Projects/soralia-village/src/features/onboarding/ui/OnboardingWizard.tsx
- State Hook: /home/ubuntupunk/Projects/soralia-village/src/features/onboarding/model/useOnboarding.ts
  Steps in the Flow (5 Steps)
  Step 2: Modules (skippable)
  Step 3: Pages (NOT skippable)
- Toggle page visibility: News, Directory, Events, Campaign, Chat
- Default: News, Directory, Events, Campaign ON; Chat OFF
- Saves to: POST /api/platform/onboarding with { pages: {...} }
  Step 4: Invite Team (skippable)
  Request Reset
  Post-Reset Actions
  Purpose: Authenticate existing users.
  FLOW 1: Tenant Resident Signup (Single-Tenant)
  Purpose: Existing community residents create accounts within their tenant's community portal.
  Entry Points
- URL: /sign-up
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/sign-up/page.tsx
  Steps in the Flow

1.  User visits /sign-up
2.  Fills in: Name, Email, Password (min 8 chars)
3.  Cloudflare Turnstile captcha is validated (if configured)
4.  Honeypot field is rendered for bot protection
5.  Form submits to POST /api/auth/signup
6.  API verifies Turnstile token
7.  API proxies to Better Auth at /api/auth/sign-up/email
8.  On success, sends welcome email (non-blocking)
9.  User is redirected to /verify-email?email=<email>
    API Endpoints Called

- POST /api/auth/signup (custom wrapper)
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/signup/route.ts
- Internally calls: POST ${BETTER_AUTH_URL}/api/auth/sign-up/email
  Database Tables Affected
- user - New user record created by Better Auth
- tenantId auto-set to tenantConfig.defaultSlug (via Better Auth additionalFields)
- profileSlug auto-generated via generateProfileSlug(user.name) (via databaseHooks.user.create.before)
- role defaults to RESIDENT
- emailVerified defaults to false
- verification - Email verification token stored
- :
  account - OAuth/provider account record (email/password)
  Auth State Changes
- User created but NOT signed in (email verification required first)
- emailVerified: false until verification link clicked
- Better Auth config: requireEmailVerification: true

1.  Verification Email (via Better Auth emailVerification.sendVerificationEmail)

- Template: templates.verifyEmail
- Subject: "Verify your Soralia Village email"
- Contains verification link (expires in 1 hour)

2.  Welcome Email (sent after successful signup in API route)

- Template: templates.welcome
- Subject: "Welcome to Soralia Village!"
- Sent non-blocking (does not block signup response)
  FLOW 2: Platform Self-Service Tenant Creation (NetComplex)
  Purpose: New community administrators create a new tenant (community) on the NetComplex platform.
  Entry Points
- URL: /signup (platform route)
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/signup/page.tsx
- Form Hook: /home/ubuntupunk/Projects/soralia-village/src/features/auth/model/useSignupForm.ts
  Steps in the Flow (3-Step Wizard)
  API Endpoints Called
- GET /api/pricing - Fetches available plans
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/pricing/route.ts
- POST /api/platform/tenants - Creates tenant + admin user
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/platform/tenants/route.ts
- Internally calls: POST ${BETTER_AUTH_URL}/api/auth/sign-up/email
  Database Tables Affected (Atomic Transaction)

1.  user - Admin user created via Better Auth first
2.  tenants - New tenant record:

- id: UUID
- name: Community name
- slug: Subdomain
- subscriptionTier: Selected plan (foundation/core/pro-max)
- tier: STANDARD (default)
- maxPages: Based on tier config
- pageCount: 0
- featureFlags: {}
- ownerId: Admin user ID
- primaryColor: "#4F46E5" (default)
- active: true

3.  user (updated) - User linked to tenant:

- tenantId: New tenant ID
- role: 'ADMIN'
- isPlatformAdmin: false
  Transaction Safety: If tenant creation fails, the user is deleted to avoid orphaned records.
- Admin user created via Better Auth
- User is NOT automatically signed in (email verification required)
- emailVerified: false until verification
- role: ADMIN (elevated within their tenant)
- isPlatformAdmin: false (not a platform-level admin)
  Email Notifications Sent

1.  Verification Email (via Better Auth)

- Same template as Flow 1

2.  No welcome email (not wired in the platform tenants route)
    Post-Registration Actions

- Redirect to /platform/onboarding/${tenantId} (onboarding wizard)
- Onboarding wizard has 5 steps (see Flow 3)
- After onboarding completion: redirect to /admin
  Validation (Zod Schema)
- Schema: signupSchema in /home/ubuntupunk/Projects/soralia-village/src/shared/api/schemas.ts
- Subdomain validation: lowercase alphanumeric + hyphens, 3-50 chars
- Password: min 8 chars, uppercase, lowercase, number required
- Plan: enum 'foundation', 'core', 'pro-max'
  Purpose: New tenant administrators configure their community after signup.
  Step 1: Branding (NOT skippable)
- Logo upload (PNG/JPEG, max 2MB)
- Primary color picker (default: #4F46E5)
- Accent color picker (optional)
- Font family selector (System, Inter, Roboto, Poppins, Lato)
- Saves to: POST /api/platform/onboarding with { branding: {...} }
- Toggle modules on/off based on tier access
- Foundation tier modules enabled by default
- Premium modules shown as upsell (bookings, marketplace, surveys, externalSurveys)
- Saves to: POST /api/platform/onboarding with { modules: {...} }
- Add co-administrators/board members via email
- Role options: ADMIN, MANAGER, BOARD
- For each invite:

1.  Saves to onboarding settings
2.  Calls POST /api/invitations for each invitee

- Saves to: POST /api/platform/onboarding with { invites: [...] }
  Step 5: Launch (NOT skippable)
- Success confirmation screen
- Links to Admin Panel (/admin) and Public Site (/)
- Saves to: POST /api/platform/onboarding with { completed: true }
- Sets onboarding_completed flag in settings
  API Endpoints Called
- POST /api/platform/onboarding - Saves each step's data
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/platform/onboarding/route.ts
- POST /api/invitations - Sends team invitations (Step 4)
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/invitations/route.ts
  Database Tables Affected
- setting - Onboarding progress stored as key-value pairs:
- onboarding_step_1: Branding data (JSON)
- onboarding_step_2: Module selections (JSON)
- onboarding_step_3: Page visibility (JSON)
- onboarding_step_4: Invite list (JSON)
- onboarding_step_5: Completion flag
- onboarding_completed: 'true' (set when step 5 saved)
- invitation - Team member invitations created (Step 4):
- email, name, role, token (UUID), status: PENDING
- expiresAt: 7 days from creation
- tenantId, inviterId, organizationId
  Auth State Changes
- No auth state changes (user must already be authenticated)
  Email Notifications Sent
- None directly from onboarding wizard
- Invitations created in Step 4 store records but email sending is not yet wired in the invitation API
  Post-Registration Actions
- After Step 5 completion: router.push('/admin')
- Tenant is fully configured and ready for use
  FLOW 4: Email Verification
  Purpose: Verify user email address before allowing sign-in.
  Entry Points
- URL: /verify-email
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/verify-email/page.tsx
  Steps in the Flow

1.  User arrives from signup redirect or manually navigates
2.  Email pre-filled from URL query parameter if available
3.  User can resend verification email
4.  Calls authClient.sendVerificationEmail({ email, callbackURL: '/dashboard' })
5.  Better Auth generates new verification token and sends email
6.  User clicks link in email -> verification URL handled by Better Auth
7.  autoSignInAfterVerification: true -> user automatically signed in
8.  afterEmailVerification hook fires (logs the event)
    API Endpoints Called

- Better Auth client: authClient.sendVerificationEmail()
- Better Auth handles verification link callback internally via /api/auth/[...all]
  Database Tables Affected
- verification - Verification token created/updated
- user - emailVerified set to true
  Auth State Changes
- emailVerified: false -> true
- User automatically signed in after verification
- Session cookie set
  Email Notifications Sent
- Verification Email (re-sent if user clicks "Resend")
- Template: templates.verifyEmail
  Post-Verification Actions
- Auto sign-in to session
- Redirect to /dashboard (callbackURL)
  FLOW 5: Password Reset
  Purpose: Users reset forgotten passwords.
  Entry Points
- Forgot Password: /forgot-password
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/forgot-password/page.tsx
- Reset Password: /reset-password?token=<token>&email=<email>
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/reset-password/page.tsx
  Steps in the Flow

1.  User visits /forgot-password
2.  Enters email address
3.  Turnstile captcha validated
4.  Submits to POST /api/auth/forgot-password
5.  API checks if user exists
6.  Generates UUID reset token
7.  Stores token in verification table with identifier: 'password-reset'
8.  Sends password reset email with link: /reset-password?token=<token>&email=<email>
9.  Always returns success (email enumeration protection)
    Complete Reset
10. User clicks link in email -> /reset-password?token=<token>&email=<email>
11. Token and email pre-filled from URL
12. Enters new password (min 8 chars) and confirmation
13. Turnstile captcha validated
14. Submits to POST /api/auth/reset-password
15. API verifies token exists, is not expired, matches email
16. Proxies to Better Auth /api/auth/reset-password
17. Deletes used verification token
18. Redirects to /sign-in
    API Endpoints Called

- POST /api/auth/forgot-password - Request reset
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/forgot-password/route.ts
- POST /api/auth/reset-password - Complete reset
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/reset-password/route.ts
- Internally calls: POST ${BETTER_AUTH_URL}/api/auth/reset-password
  Database Tables Affected
- verification - Reset token created (identifier: 'password-reset')
- verification - Token deleted after use
- user - Password hash updated (via Better Auth)
  Auth State Changes
- No session changes during reset flow
- After reset: user must sign in again with new password
  Email Notifications Sent
- Password Reset Email
- Template: templates.passwordReset
- Subject: "Reset your Soralia Village password"
- Link expires in 1 hour
- Redirect to /sign-in
- User signs in with new password
  FLOW 6: Sign-In (Authentication)
  Entry Points
- Tenant Sign-In: /sign-in
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(auth)/sign-in/page.tsx
- Platform Sign-In: /login
- Component: /home/ubuntupunk/Projects/soralia-village/src/app/(platform)/login/page.tsx
  Steps in the Flow
  Tenant Sign-In (/sign-in)

1.  User enters email and password
2.  Turnstile captcha validated
3.  Submits to POST /api/auth/signin
4.  API verifies Turnstile, proxies to Better Auth /api/auth/sign-in/email
5.  Better Auth validates credentials
6.  If email not verified: returns 403, shows "Resend verification" link
7.  On success: session cookie set, redirect to /dashboard
    Platform Sign-In (/login)
8.  User enters email and password
9.  Submits directly to Better Auth /api/auth/sign-in/email
10. On success: redirect to /admin/platform
    API Endpoints Called

- POST /api/auth/signin (tenant, with Turnstile)
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/signin/route.ts
- POST /api/auth/sign-in/email (Better Auth native, platform login)
  Database Tables Affected
- session - New session record created
- user - emailVerified checked
  Auth State Changes
- Session cookie created (better-auth.session_token)
- Session includes: userId, user role, tenant context
  Email Notifications Sent
- Verification Email (if sendOnSignIn: true and email not verified)
- Triggered automatically by Better Auth config
  Post-Sign-In Actions
- Tenant users: redirect to /dashboard
- Platform users: redirect to /admin/platform
- Unverified users: shown link to resend verification
  FLOW 7: Team Invitation (During Onboarding)
  Purpose: Tenant admins invite co-administrators/board members during onboarding.
  Entry Points
- Component: /home/ubuntupunk/Projects/soralia-village/src/features/onboarding/ui/steps/InviteStep.tsx
- Triggered during Onboarding Wizard Step 4
  Steps in the Flow

1.  Admin enters email and selects role (ADMIN/MANAGER/BOARD)
2.  Clicks "Add" to add to invite list
3.  Can add multiple invites
4.  Clicks "Continue" to save and send
5.  For each invite: POST /api/invitations
6.  Invitation record created with PENDING status
    API Endpoints Called

- POST /api/invitations - Create invitation
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/invitations/route.ts
- DELETE /api/invitations/[id] - Cancel invitation
- File: /home/ubuntupunk/Projects/soralia-village/src/app/api/invitations/[id]/route.ts
  Database Tables Affected
- invitation - New invitation record:
- id: UUID
- email: Unique
- name: Derived from email
- role: ADMIN/MANAGER/BOARD
- residentType: OWNER (default)
- token: UUID (unique)
- status: PENDING
- expiresAt: 7 days from creation
- tenantId: Current tenant
- inviterId: Current user
- organizationId: Placeholder (not yet wired)
  Auth State Changes
- No immediate auth changes
- Invitee must accept invitation separately (acceptance flow NOT YET IMPLEMENTED)
  Email Notifications Sent
- None currently - The invitation API creates records but does not send emails
  Post-Invitation Actions
- Invitations stored in database with PENDING status
- NOTE: There is NO implemented invitation acceptance flow in the codebase
- The planning documents reference a future flow where invitees would accept via token link
  BETTER AUTH CONFIGURATION SUMMARY
  File: /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth.ts
  Plugins Enabled

1.  twoFactor - 2FA with issuer from tenant config
2.  organization - Multi-organization support (Better Auth org plugin)
3.  bearer - Bearer token authentication
4.  passkey - Passkey/WebAuthn authentication
    Database Schema (Drizzle Adapter)
    Mapped tables:

- user -> users
- session -> sessions
- account -> accounts
- verification -> verifications
- passkey -> passkeys
- twoFactor -> twoFactors
- member -> members
- invitation -> invitations
- organization -> organizations
  User Additional Fields (Auto-Managed)
- tenantId: string, required, default from tenantConfig.defaultSlug, input: false
- dashboardLayout: string, optional, input: false
- profileSlug: string, optional, auto-generated on signup, input: false
  Email Configuration
- requireEmailVerification: true - Must verify before sign-in
- sendOnSignIn: true - Send verification email on sign-in if not verified
- autoSignInAfterVerification: true - Auto sign-in after email verification
  Database Hooks
- user.create.before: Auto-generates profileSlug from user name using generateProfileSlug()
  Callbacks
- emailAndPassword.onExistingUserSignUp: Sends security alert email if signup attempted with existing email
- emailVerification.afterEmailVerification: Logs verification event
  THIRD-PARTY/PROVIDER REGISTRATION
  Status: NOT IMPLEMENTED
  The codebase has NO OAuth/social login providers configured. The Better Auth configuration only uses:
- Email/password authentication (emailAndPassword: { enabled: true })
- Passkey authentication (passkey() plugin)
- Two-factor authentication (twoFactor() plugin)
  No Google, GitHub, or other social provider configurations exist in auth.ts.
  KEY FILES REFERENCE
  File Purpose
  /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth.ts Better Auth server configuration
  /home/ubuntupunk/Projects/soralia-village/src/shared/api/auth-client.ts Better Auth client configuration
  /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/[...all]/route.ts Better Auth catch-all handler
  /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/signup/route.ts Resident signup API
  /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/signin/route.ts Tenant sign-in API
  /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/forgot-password/route.ts Password reset request
  /home/ubuntupunk/Projects/soralia-village/src/app/api/auth/reset-password/route.ts Password reset completion
  /home/ubuntupunk/Projects/soralia-village/src/app/api/platform/tenants/route.ts Platform tenant creation
  /home/ubuntupunk/Projects/soralia-village/src/app/api/platform/onboarding/route.ts Onboarding step saving
  /home/ubuntupunk/Projects/soralia-village/src/app/api/invitations/route.ts Invitation creation
  /home/ubuntupunk/Projects/soralia-village/src/shared/api/email/templates.ts All email templates
  /home/ubuntupunk/Projects/soralia-village/src/shared/api/schemas.ts Zod validation schemas
  /home/ubuntupunk/Projects/soralia-village/prisma/schema.p Database schema
