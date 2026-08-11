import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const getSessionMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();
const signUpMock = vi.fn();
const updateUserMock = vi.fn();
const useSessionMock = vi.fn();

vi.mock('better-auth/react', () => ({
  createAuthClient: vi.fn(() => ({
    getSession: getSessionMock,
    useSession: useSessionMock,
    signIn: {
      email: signInMock,
    },
    signUp: {
      email: signUpMock,
    },
    signOut: signOutMock,
    updateUser: updateUserMock,
  })),
}));

vi.mock('better-auth/client/plugins', () => ({
  twoFactorClient: () => ({}),
  organizationClient: () => ({}),
  adminClient: () => ({}),
  emailOTPClient: () => ({}),
  oneTapClient: () => ({}),
  inferAdditionalFields: () => ({}),
}));

import { authClient, signIn, signUp, getSession, invalidateSessionCache } from '../auth-client';

describe('getSession client cache', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    invalidateSessionCache();
    getSessionMock.mockReset();
    signInMock.mockReset();
    signOutMock.mockReset();
    signUpMock.mockReset();
    updateUserMock.mockReset();
    getSessionMock.mockResolvedValue({
      data: { session: { token: 'tok-1' }, user: { id: 'u1' } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dedupes concurrent calls into a single network request', async () => {
    const [a, b, c] = await Promise.all([
      authClient.getSession(),
      authClient.getSession(),
      authClient.getSession(),
    ]);

    expect(getSessionMock).toHaveBeenCalledTimes(1);
    expect(a.data?.session.token).toBe('tok-1');
    expect(b).toBe(a);
    expect(c).toBe(a);
  });

  it('reuses the cached session within the TTL window', async () => {
    await authClient.getSession();
    vi.advanceTimersByTime(10_000);
    await authClient.getSession();

    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });

  it('refetches once the TTL window expires', async () => {
    await authClient.getSession();
    vi.advanceTimersByTime(31_000);
    await authClient.getSession();

    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('refetches after the cached call rejected', async () => {
    getSessionMock.mockRejectedValueOnce(new Error('network down'));

    await expect(authClient.getSession()).rejects.toThrow('network down');
    await authClient.getSession();

    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache after signIn', async () => {
    await authClient.getSession();
    await signIn.email({ email: 'a@b.com', password: 'pw' });

    expect(signInMock).toHaveBeenCalledTimes(1);
    expect(getSessionMock).toHaveBeenCalledTimes(1);

    await authClient.getSession();
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache after signOut', async () => {
    await authClient.getSession();
    await authClient.signOut();

    expect(signOutMock).toHaveBeenCalledTimes(1);

    await authClient.getSession();
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache after signUp', async () => {
    await authClient.getSession();
    await signUp.email({ email: 'a@b.com', password: 'pw' });

    expect(signUpMock).toHaveBeenCalledTimes(1);

    await authClient.getSession();
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('invalidates the cache after updateUser', async () => {
    await authClient.getSession();
    await authClient.updateUser({ image: 'new-avatar' });

    expect(updateUserMock).toHaveBeenCalledTimes(1);

    await authClient.getSession();
    expect(getSessionMock).toHaveBeenCalledTimes(2);
  });

  it('routes the named getSession export through the cache too', async () => {
    await getSession();
    await getSession();

    expect(getSessionMock).toHaveBeenCalledTimes(1);
  });
});
