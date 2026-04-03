import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { twoFactor, organization, admin, bearer } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { prisma } from './prisma';

/**
 * Better Auth configuration for Soralia Village.
 * Configured with Prisma adapter, two-factor auth, organization support, and passkey.
 */
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
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
