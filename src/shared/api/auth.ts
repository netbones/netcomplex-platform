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

/**
 * Better Auth configuration for Soralia Village.
 * Configured with Drizzle adapter, two-factor auth, organization support, and passkey.
 * Uses tenantConfig for environment-specific settings.
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
    requireEmailVerification: false,
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
