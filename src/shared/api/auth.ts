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
import { tenantConfig } from '@entities/tenant';
import { sendEmail } from '@shared/api/email/resend';
import { templates } from '@shared/api/email/templates';
import { authLogger } from '@shared/lib';
import { generateProfileSlug } from '@shared/api/slug';

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
    sendResetPassword: async ({ user, token }) => {
      const resetUrl = `${ENV.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
      sendEmail({
        to: user.email,
        subject: templates.passwordReset.subject,
        html: templates.passwordReset.getHtml(resetUrl),
      }).catch(err =>
        authLogger.error({ err, email: user.email }, 'Password reset email send failed')
      );
    },
    async onExistingUserSignUp({ user }) {
      sendEmail({
        to: user.email,
        subject: templates.securityAlert.subject,
        html: templates.securityAlert.getHtml(user.email),
      }).catch(err =>
        authLogger.error({ err, email: user.email }, 'Security alert email send failed')
      );
      authLogger.info({ email: user.email }, 'Sign-up attempt with existing email - alert sent');
    },
  },
  // Wire verification email via Better Auth (used when requireEmailVerification is true)
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      sendEmail({
        to: user.email,
        subject: templates.verifyEmail.subject,
        html: templates.verifyEmail.getHtml(user.name || '', url),
      }).catch(err =>
        authLogger.error({ err, email: user.email }, 'Verification email send failed')
      );
    },
    sendOnSignIn: true, // Send verification email on sign-in if not verified
    autoSignInAfterVerification: true, // Auto sign-in user after email verification
    async afterEmailVerification(user) {
      // Grant access to all features during testing phase (log verification)
      authLogger.info({ email: user.email }, 'Email verified');
    },
  },
  // Use additionalFields to add tenantId, dashboardLayout, and profileSlug as managed fields
  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: true,
        defaultValue: tenantConfig.defaultSlug,
        input: false, // Users cannot set this during signup - it's auto-set
      },
      dashboardLayout: {
        type: 'string',
        required: false,
        input: false, // Managed by the application
      },
      profileSlug: {
        type: 'string',
        required: false,
        input: false, // Auto-generated on signup
      },
      role: {
        type: 'string',
        required: false,
        defaultValue: 'RESIDENT',
        input: false, // Role is managed by admins, not settable during signup
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
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          return {
            data: {
              ...user,
              profileSlug: generateProfileSlug(user.name),
            },
          };
        },
      },
    },
  },
});
