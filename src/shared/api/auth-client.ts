import { createAuthClient } from 'better-auth/react';
import {
  twoFactorClient,
  organizationClient,
  adminClient,
  emailOTPClient,
  inferAdditionalFields,
} from 'better-auth/client/plugins';

function createClient() {
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
      inferAdditionalFields({
        user: {
          role: { type: 'string' },
        },
      }),
    ],
  });
}

type AuthClientType = ReturnType<typeof createClient>;

let client: AuthClientType | null = null;

function getClient(): AuthClientType {
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

export const signOut = ((...args: Parameters<AuthClientType['signOut']>) =>
  getClient().signOut(...args)) as AuthClientType['signOut'];

export const useSession: AuthClientType['useSession'] = (...args) =>
  getClient().useSession(...args);

export const getSession = ((...args: Parameters<AuthClientType['getSession']>) =>
  getClient().getSession(...args)) as AuthClientType['getSession'];
