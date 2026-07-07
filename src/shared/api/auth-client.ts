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

/* eslint-disable @typescript-eslint/no-explicit-any */
export const signIn: any = new Proxy({} as any, {
  get(_, prop) {
    return (...args: unknown[]) =>
      ((getClient().signIn as any)[prop] as (...a: unknown[]) => unknown)?.(...args);
  },
});

export const signUp: any = new Proxy({} as any, {
  get(_, prop) {
    return (...args: unknown[]) =>
      ((getClient().signUp as any)[prop] as (...a: unknown[]) => unknown)?.(...args);
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: any = (...args: unknown[]) =>
  (getClient().signOut as (...a: unknown[]) => unknown)(...args);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSession: any = (...args: unknown[]) =>
  (getClient().useSession as (...a: unknown[]) => unknown)(...args);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSession: any = (...args: unknown[]) =>
  (getClient().getSession as (...a: unknown[]) => unknown)(...args);
