import { createAuthClient } from 'better-auth/react';
import {
  twoFactorClient,
  organizationClient,
  adminClient,
  emailOTPClient,
} from 'better-auth/client/plugins';

/**
 * Better Auth client for client-side authentication.
 * Uses two-factor auth, organization support, and admin features.
 *
 * baseURL is resolved lazily on first access via Proxy to avoid capturing
 * `localhost:3000` during SSR (Next.js executes client-module top-level
 * code on the server). At runtime in the browser, `window.location.origin`
 * gives the correct origin regardless of which domain the Apache proxy serves.
 */
type AuthClientType = ReturnType<typeof createAuthClient>;

function createClient(): AuthClientType {
  const env = process.env.NEXT_PUBLIC_BETTER_AUTH_URL;
  const baseURL = env || (typeof window !== 'undefined' ? window.location.origin : '');
  return createAuthClient({
    ...(baseURL ? { baseURL } : {}),
    basePath: '/api/auth',
    plugins: [
      twoFactorClient({ twoFactorPage: '/two-factor' }),
      organizationClient(),
      adminClient(),
      emailOTPClient(),
    ],
  });
}

let client: AuthClientType | null = null;

function getClient(): AuthClientType {
  // On the server (SSR), always create fresh to avoid capturing '' baseURL.
  // On the client, cache after first creation so all accessors share one instance.
  if (typeof window === 'undefined') {
    return createClient();
  }
  if (!client) client = createClient();
  return client;
}

export const authClient = new Proxy<AuthClientType>({} as AuthClientType, {
  get(_, prop) {
    return Reflect.get(getClient(), prop, _);
  },
}) as AuthClientType;

export const signIn = ((...args: Parameters<AuthClientType['signIn']>) =>
  getClient().signIn(...args)) as AuthClientType['signIn'];

export const signOut = ((...args: Parameters<AuthClientType['signOut']>) =>
  getClient().signOut(...args)) as AuthClientType['signOut'];

export const signUp = ((...args: Parameters<AuthClientType['signUp']>) =>
  getClient().signUp(...args)) as AuthClientType['signUp'];

export const useSession: AuthClientType['useSession'] = (...args) =>
  getClient().useSession(...args);

export const getSession = ((...args: Parameters<AuthClientType['getSession']>) =>
  getClient().getSession(...args)) as AuthClientType['getSession'];
