import { createAuthClient } from 'better-auth/react';
import {
  twoFactorClient,
  organizationClient,
  adminClient,
  emailOTPClient,
  oneTapClient,
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
      oneTapClient({
        clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      }),
      inferAdditionalFields({
        user: {
          role: { type: 'string', required: false, defaultValue: 'USER', input: false },
          tenantId: { type: 'string', nullable: true, required: false, input: true },
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

const SESSION_CACHE_TTL_MS = 30_000;

type SessionResponse = Awaited<ReturnType<AuthClientType['getSession']>>;

let cachedSessionPromise: Promise<SessionResponse> | null = null;
let cachedSessionAt = 0;

export function invalidateSessionCache(): void {
  cachedSessionPromise = null;
  cachedSessionAt = 0;
}

/**
 * Deduplicated getSession() for the client.
 *
 * Every REST/tRPC request used to call authClient.getSession() directly, which
 * hits /api/auth/get-session over the network once per call — a dashboard page
 * with N API requests fired N extra round-trips. This wrapper shares one
 * in-flight promise and reuses the resolved session for a short TTL, so a page
 * load collapses to a single get-session request.
 */
export function getCachedSession(...args: unknown[]): Promise<SessionResponse> {
  if (args.length > 0) {
    // Parametrized calls (e.g. disableCookieCache) are rare — never cache them.
    return (getClient().getSession as (...a: unknown[]) => Promise<SessionResponse>)(...args);
  }
  const now = Date.now();
  if (cachedSessionPromise && now - cachedSessionAt < SESSION_CACHE_TTL_MS) {
    return cachedSessionPromise;
  }
  const promise = getClient().getSession() as Promise<SessionResponse>;
  cachedSessionPromise = promise;
  cachedSessionAt = now;
  promise.catch(() => {
    if (cachedSessionPromise === promise) {
      cachedSessionPromise = null;
      cachedSessionAt = 0;
    }
  });
  return promise;
}

function invalidateOnAuthMutation<T extends (...args: unknown[]) => unknown>(fn: T): T {
  return ((...args: unknown[]) => {
    invalidateSessionCache();
    return fn(...args);
  }) as T;
}

const AUTH_MUTATIONS = new Set(['signIn', 'signUp', 'signOut', 'updateUser']);

export const authClient = new Proxy<AuthClientType>({} as AuthClientType, {
  get(_, prop) {
    if (prop === 'getSession') return getCachedSession;
    const value = Reflect.get(getClient(), prop, _);
    if (AUTH_MUTATIONS.has(String(prop))) {
      if (typeof value === 'function') return invalidateOnAuthMutation(value);
      if (value && typeof value === 'object') {
        // signIn / signUp are path proxies (signIn.email, ...). Wrap so any
        // nested call invalidates the session cache before delegating.
        return new Proxy(value as object, {
          get(target, subProp, receiver) {
            const sub = Reflect.get(target, subProp, receiver);
            if (typeof sub === 'function') return invalidateOnAuthMutation(sub);
            return sub;
          },
        });
      }
    }
    return value;
  },
}) as AuthClientType;

/* eslint-disable @typescript-eslint/no-explicit-any */
export const signIn: any = new Proxy({} as any, {
  get(_, prop) {
    return (...args: unknown[]) => {
      invalidateSessionCache();
      return ((getClient().signIn as any)[prop] as (...a: unknown[]) => unknown)?.(...args);
    };
  },
});

export const signUp: any = new Proxy({} as any, {
  get(_, prop) {
    return (...args: unknown[]) => {
      invalidateSessionCache();
      return ((getClient().signUp as any)[prop] as (...a: unknown[]) => unknown)?.(...args);
    };
  },
});
/* eslint-enable @typescript-eslint/no-explicit-any */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: any = (...args: unknown[]) => {
  invalidateSessionCache();
  return (getClient().signOut as (...a: unknown[]) => unknown)(...args);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const useSession: any = (...args: unknown[]) =>
  (getClient().useSession as (...a: unknown[]) => unknown)(...args);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const getSession: any = (...args: unknown[]) => getCachedSession(...args);
