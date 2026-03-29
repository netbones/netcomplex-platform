import { createAuthClient } from 'better-auth/react';
import { twoFactorClient, organizationClient, adminClient } from 'better-auth/client/plugins';

/**
 * Better Auth client for client-side authentication.
 * Uses two-factor auth, organization support, and admin features.
 */
export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || 'http://localhost:3000',
  basePath: '/api/auth',
  plugins: [
    twoFactorClient({
      twoFactorPage: '/two-factor',
    }),
    organizationClient(),
    adminClient(),
  ],
});

export const { signIn, signOut, signUp, useSession, getSession } = authClient;
