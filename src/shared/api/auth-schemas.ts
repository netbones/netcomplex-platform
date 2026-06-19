import { z } from 'zod';

/**
 * Zod schemas for the 4 critical Better Auth endpoints.
 * Wired into the `validator` plugin in src/shared/api/auth.ts.
 *
 * Each schema validates the request body BEFORE the Better Auth handler runs.
 * Validation failures return 400 with a Zod error message; valid payloads
 * pass through unchanged to the Better Auth handler.
 *
 * Field names match Better Auth's internal API exactly. Renaming them will
 * break validation. Optional fields use `.optional()` so that the absence of
 * the field is accepted (Better Auth may inject defaults).
 */

/**
 * POST /sign-up/email — Register a new user with email + password.
 * @property email - Valid email address (RFC 5322 simplified)
 * @property password - At least 8 characters (defense-in-depth on top of Better Auth's scrypt hashing)
 * @property name - Display name, 1-100 chars
 * @property callbackURL - Optional redirect URL after verification
 */
export const signUpEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  callbackURL: z.string().url().optional(),
});

/**
 * POST /sign-in/email — Sign in with email + password.
 * @property email - Valid email address
 * @property password - At least 1 character (existence check; correct password is enforced by Better Auth)
 * @property rememberMe - Optional "keep me signed in" flag
 */
export const signInEmailSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

/**
 * POST /forget-password — Request a password reset email.
 * @property email - Email of the account to reset
 * @property redirectTo - Optional URL to redirect to from the reset link
 */
export const forgetPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  redirectTo: z.string().url().optional(),
});

/**
 * POST /reset-password — Complete a password reset with token + new password.
 * @property token - Reset token from the email link (non-empty)
 * @property newPassword - New password, at least 8 characters
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

/**
 * OTP verification schema for emailOTP plugin (Phase 45-01).
 * Validates the request body before the emailOTP verify endpoint processes it.
 */
export const verifyOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

/**
 * OTP send schema — validates the send-verification-otp request (Phase 45-01).
 * Better Auth expects { email, type } for the send endpoint.
 */
export const sendOtpSchema = z.object({
  email: z.string().email('Invalid email address'),
  type: z.enum(['sign-in', 'email-verification', 'forget-password']),
});
