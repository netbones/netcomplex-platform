import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { twoFactor, organization, bearer } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { ENV } from 'varlock/env';
import {
  db,
  users,
  sessions,
  accounts,
  verifications,
  passkeys,
  twoFactors,
  members,
  invitations,
  organizations,
} from '@api/db';
import { tenantConfig } from '@entities/tenant/api/tenant';
import { sendEmail } from '@shared/api/email/resend';
import { templates } from '@shared/api/email/templates';
import { authLogger } from '@shared/lib';

/**
 * Better Auth configuration for Soralia Village.
 * Configured with Drizzle adapter, two-factor auth, organization support, and passkey.
 * Uses tenantConfig for environment-specific settings.
 *
 * Email sending is wired via Better Auth's built-in email options:
 * - emailVerification.sendVerificationEmail: sends verification/signup emails (when requireEmailVerification is true)
 * - emailAndPassword.sendResetPassword: sends password reset emails
 *
 * For welcome emails when requireEmailVerification is false, we use onSignUp callback.
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
      passkey: passkeys,
      twoFactor: twoFactors,
      member: members,
      invitation: invitations,
      organization: organizations,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true, // Require email verification before sign-in
    // Wire password reset email via Better Auth
    sendResetPassword: async ({ user, url }) => {
      // Use void to avoid blocking - prevents timing attacks
      void sendEmail({
        to: user.email,
        subject: templates.passwordReset.subject,
        html: templates.passwordReset.getHtml(url),
      });
    },
    async onExistingUserSignUp({ user }) {
      // Notify existing user about sign-up attempt (security measure)
      // TODO: Implement email notification to existing user
      authLogger.info({ email: user.email }, 'Sign-up attempt with existing email');
    },
  },
  // Wire verification email via Better Auth (used when requireEmailVerification is true)
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      // Use void to avoid blocking - prevents timing attacks on email enumeration
      void sendEmail({
        to: user.email,
        subject: templates.verifyEmail.subject,
        html: templates.verifyEmail.getHtml(user.name || '', url),
      });
    },
    sendOnSignIn: true, // Send verification email on sign-in if not verified
    autoSignInAfterVerification: true, // Auto sign-in user after email verification
    async afterEmailVerification(user) {
      // Grant access to all features during testing phase
      // TODO: Remove or adjust this after testing phase ends
      authLogger.info({ email: user.email }, 'Email verified - granting testing access');
    },
  },
  // Use additionalFields to add tenantId as a managed field that Better Auth handles
  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: true,
        defaultValue: tenantConfig.defaultSlug,
        input: false, // Users cannot set this during signup - it's auto-set
      },
    },
  },
  plugins: [twoFactor({ issuer: tenantConfig.auth.issuer }), organization(), bearer(), passkey()],
  advanced: {
    cookiePrefix: tenantConfig.auth.cookiePrefix,
  },
  baseURL: {
    allowedHosts: tenantConfig.auth.allowedHosts,
  },
  trustedOrigins: [ENV.BETTER_AUTH_URL || 'http://localhost:3000'],
});
