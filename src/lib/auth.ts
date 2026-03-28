import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import { twoFactor, organization, admin, bearer } from 'better-auth/plugins';
import { passkey } from '@better-auth/passkey';
import { prisma } from './prisma';

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql',
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  emailMagicLink: {
    enabled: true,
  },
  plugins: [
    twoFactor({
      issuer: 'Soralia Village',
    }),
    organization(),
    admin(),
    bearer(),
    passkey(),
  ],
  advanced: {
    cookiePrefix: 'soralia',
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || 'http://localhost:3000'],
});

export type Session = typeof auth.$Infer.Session;
