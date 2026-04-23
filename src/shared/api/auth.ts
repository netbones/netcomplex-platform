import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { twoFactor, organization, admin, bearer } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
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
import { tenantConfig } from './config/tenant';
import { sendEmail } from '@/lib/email/mailer-send';
import { templates } from '@/lib/email/templates';

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
    sendResetPassword: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: templates.passwordReset.subject,
        html: templates.passwordReset.getHtml(url),
      });
    },
  },
  // Wire verification email via Better Auth (used when requireEmailVerification is true)
  emailVerification: {
    sendVerificationEmail: async ({ user, url, token }) => {
      await sendEmail({
        to: user.email,
        subject: templates.verifyEmail.subject,
        html: templates.verifyEmail.getHtml(user.name || '', url),
      });
    },
    sendOnSignUp: false, // Don't send on signup - require verification first
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
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
});
