import { betterAuth } from 'better-auth';
import { drizzleAdapter } from '@better-auth/drizzle-adapter';
import { twoFactor, organization, bearer, emailOTP, admin } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { ENV } from 'varlock/env';
import {
  db,
  authDb,
  users,
  sessions,
  accounts,
  verifications,
  passkeys,
  twoFactors,
  members,
  invitations,
  organizations,
  tenants,
} from './db';
import { tenantConfig } from '@shared/lib';
import { sendEmail } from './email/resend';
import { templates } from './email/templates';
import { authLogger } from '@shared/lib';
import { generateProfileSlug } from './slug';
import { validator } from 'validation-better-auth';
import { eq } from 'drizzle-orm';
import {
  signUpEmailSchema,
  signInEmailSchema,
  forgetPasswordSchema,
  resetPasswordSchema,
  sendOtpSchema,
} from './auth-schemas';

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
  database: drizzleAdapter(authDb, {
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
    customSyntheticUser: {
      banned: false,
      banReason: null,
      banExpires: null,
    },
    // DISABLED: emailOTP plugin handles password reset via 6-digit OTP (Phase 45-01, D-07)
    // sendResetPassword: async ({ user, token }) => {
    //   const resetUrl = `${ENV.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;
    //   sendEmail({
    //     to: user.email,
    //     subject: templates.passwordReset.subject,
    //     html: templates.passwordReset.getHtml(resetUrl),
    //   }).catch(err =>
    //     authLogger.error({ err, email: user.email }, 'Password reset email send failed')
    //   );
    // },
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
        defaultValue: 'USER',
        input: false, // Role is managed by admins, not settable during signup
      },
    },
  },
  plugins: [
    admin({
      adminUserIds: ['FmFmv6QHWXcwTzXbFDnxvEjF2Q4Qh4SE'],
    }),
    twoFactor({ issuer: tenantConfig.auth.issuer }),
    organization(),
    bearer(),
    passkey(),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      sendVerificationOnSignUp: false,
      async sendVerificationOTP({ email, otp, type }) {
        if (type === 'forget-password') {
          sendEmail({
            to: email,
            subject: templates.passwordResetOtp.subject,
            html: templates.passwordResetOtp.getHtml(otp),
          }).catch(err => authLogger.error({ err, email }, 'OTP email send failed'));
        } else if (type === 'email-verification') {
          sendEmail({
            to: email,
            subject: 'Your Soralia Village verification code',
            html: `<p>Your verification code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
          }).catch(err => authLogger.error({ err, email }, 'OTP verification email send failed'));
        } else if (type === 'sign-in') {
          sendEmail({
            to: email,
            subject: 'Your Soralia Village sign-in code',
            html: `<p>Your sign-in code is: <strong>${otp}</strong></p><p>This code expires in 5 minutes.</p>`,
          }).catch(err => authLogger.error({ err, email }, 'OTP sign-in email send failed'));
        }
      },
    }),
    validator([
      { path: '/sign-up/email', schema: signUpEmailSchema },
      { path: '/sign-in/email', schema: signInEmailSchema },
      { path: '/forget-password', schema: forgetPasswordSchema },
      { path: '/reset-password', schema: resetPasswordSchema },
      { path: '/email-otp/send-verification-otp', schema: sendOtpSchema },
    ]),
  ],
  advanced: {
    cookiePrefix: tenantConfig.auth.cookiePrefix,
  },
  baseURL: {
    allowedHosts: tenantConfig.auth.allowedHosts,
  },
  trustedOrigins: [
    ENV.BETTER_AUTH_URL || 'http://localhost:3000',
    // Include NEXT_PUBLIC_APP_URL as fallback for environments where
    // BETTER_AUTH_URL is not set separately.
    ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    // Include common dev and preview origins so session cookies are
    // accepted from browsers accessing via different URLs (Vercel
    // previews, localhost ports, custom domains).
    ...(process.env.NODE_ENV === 'production'
      ? []
      : ['http://localhost:3001', 'https://localhost:3000']),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          const rawTenantId = (user as Record<string, unknown>)?.tenantId as string | undefined;
          const [tenant] = rawTenantId
            ? await db
                .select({ id: tenants.id })
                .from(tenants)
                .where(eq(tenants.slug, rawTenantId))
                .limit(1)
            : [];

          return {
            data: {
              ...user,
              tenantId: tenant?.id ?? rawTenantId ?? tenantConfig.defaultSlug,
              profileSlug: generateProfileSlug(user.name),
              role: 'USER',
            },
          };
        },
      },
    },
  },
});
