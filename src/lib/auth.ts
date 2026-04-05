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
} from './db';
import { getTenantBySlug } from './tenant';

/**
 * Better Auth configuration for Soralia Village.
 * Configured with Drizzle adapter, two-factor auth, organization support, and passkey.
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
  databaseHooks: {
    user: {
      create: {
        before: async user => {
          // Get tenant from environment or default to soralia for development
          const tenantSlug = process.env.LOCAL_TENANT_SLUG || 'soralia';
          const tenant = await getTenantBySlug(tenantSlug);

          if (!tenant) {
            console.error(`Tenant not found: ${tenantSlug}. Create tenant in database first.`);
            throw new Error(`Tenant not found: ${tenantSlug}`);
          }

          return {
            data: {
              ...user,
              tenantId: tenant.id,
            },
          };
        },
      },
    },
  },
  plugins: [twoFactor({ issuer: 'Soralia Village' }), organization(), bearer(), passkey()],
  advanced: {
    cookiePrefix: 'soralia',
  },
  baseURL: {
    allowedHosts: [
      'soralia-village.com',
      'www.soralia-village.com',
      '*.vercel.app',
      'localhost:3000',
      'localhost:3001',
    ],
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
});
