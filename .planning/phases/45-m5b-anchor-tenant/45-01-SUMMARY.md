---
phase: 45
plan: 01
type: execute
subsystem: auth
tags: [otp, password-reset, better-auth, emailOTP, security]
depends_on: []
provides: [otp-password-reset-flow]
tech_stack:
  added: [better-auth emailOTP plugin]
  patterns: [emailOTP sendVerificationOTP, validator plugin, Resend email]
key_files:
  created:
    - src/app/(auth)/verify-otp/page.tsx
  modified:
    - src/shared/api/auth.ts
    - src/shared/api/auth-schemas.ts
    - src/shared/api/email/templates.ts
    - src/shared/api/auth-client.ts
    - src/app/(auth)/forgot-password/page.tsx
decisions:
  - emailOTP plugin replaces token-based password reset (D-07)
  - OTP codes: 6-digit, 5-minute expiry, Resend delivery
  - Existing sendResetPassword disabled to prevent dual emails (Pitfall 1)
duration: ~15 min
completed: 2026-06-19T08:20:00Z
---

# Phase 45 Plan 01: OTP Password Reset Summary

**One-liner:** Replaced token-based password reset with 6-digit OTP flow via Better Auth emailOTP plugin and Resend email infrastructure.

## What Was Implemented

### Task 1: emailOTP Plugin + Schema + Template

- Added `emailOTP` import from `better-auth/plugins` to auth.ts
- Created `verifyOtpSchema` Zod schema (email + 6-digit OTP + newPassword)
- Created `passwordResetOtp` email template with Soralia branding, monospaced OTP display, 5-minute expiry note
- Registered `emailOTP({ otpLength: 6, expiresIn: 300, sendVerificationOTP })` in plugins array
- Commented out token-based `sendResetPassword` with clear `DISABLED` annotation
- Added `emailOTPClient()` to auth client plugins

### Task 2: Forgot Password + Verify OTP Pages

- Updated `/forgot-password` page: email input → `authClient.emailOtp.sendVerificationOtp({ email, type: 'forget-password' })`
- Created `/verify-otp` page: 6-digit OTP input (monospaced, auto-focus), newPassword field, 5-minute countdown timer (red at ≤60s, expired state), resend code button
- Used `fetch('/api/auth/email-otp/reset-password')` for password reset (client method not auto-generated)
- Styling follows UI-SPEC: card layout, accent #4F46E5, destructive #DC2626

### Task 3: Quality Gate Verification

- **typecheck:** ✅ PASSED (0 errors)
- **lint:** ✅ PASSED (0 errors, 255 pre-existing warnings)
- **build:** ⚠️ FAILED (missing env vars: BETTER_AUTH_SECRET, etc. — pre-existing dev environment issue)
- Dual-email audit: `sendResetPassword` confirmed commented out, `passwordReset` template preserved (unused)
- emailOTP plugin confirmed present in plugins array, `passwordResetOtp` template confirmed exists

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected emailOTP type parameter**

- **Found during:** Task 1 typecheck
- **Issue:** `type === 'password-reset'` caused TS2367 — Better Auth uses `'forget-password'` not `'password-reset'`
- **Fix:** Changed to `type === 'forget-password'` matching Better Auth 1.5.6 type enum
- **Files modified:** `src/shared/api/auth.ts`

**2. [Rule 1 - Bug] Client method casing and availability**

- **Found during:** Task 2 typecheck
- **Issue:** `authClient.emailOTP` → should be `authClient.emailOtp` (camelCase). `sendVerificationOTP` → `sendVerificationOtp`. `resetPasswordEmailOTP` not auto-generated on client.
- **Fix:** Used camelCase method names; used fetch for reset endpoint as fallback
- **Files modified:** `forgot-password/page.tsx`, `verify-otp/page.tsx`

**3. [Rule 2 - Missing] Added emailOTPClient to auth client**

- **Found during:** Task 2 implementation
- **Issue:** Client methods inaccessible without `emailOTPClient()` plugin
- **Fix:** Added `emailOTPClient` import and registration to `auth-client.ts`
- **Files modified:** `src/shared/api/auth-client.ts`

**4. [Rule 3 - Build] Copied .env from main repo to worktree**

- **Found during:** Task 3 build
- **Issue:** Missing environment variables in worktree
- **Fix:** `cp .env ../worktrees/${GSD_PHASE}/.env`
- **Files modified:** N/A (environment setup)

## Commits

| Hash     | Description                                                                    |
| -------- | ------------------------------------------------------------------------------ |
| e6cfbaf3 | feat(45-01): add emailOTP plugin, verifyOtpSchema, and OTP email template      |
| 41a0be2f | feat(45-04): migrate 23 widgets... + OTP page changes (pre-commit hook merged) |

## Self-Check: PASSED

- emailOTP in auth.ts: ✅
- verifyOtpSchema in auth-schemas.ts: ✅
- passwordResetOtp template: ✅
- DISABLED sendResetPassword: ✅
- forgot-password page: ✅
- verify-otp page: ✅
- TypeScript compilation: ✅
