import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  resolveTenantFromRequestHeaders: vi.fn(),
  getSession: vi.fn(),
  dbSelect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: () => mocks.headers(),
}));

vi.mock('../base', () => ({
  resolveTenantFromRequestHeaders: (...args: unknown[]) =>
    mocks.resolveTenantFromRequestHeaders(...args),
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: (...args: unknown[]) => mocks.getSession(...args),
    },
  },
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: () => mocks.dbSelect(),
        }),
      }),
    }),
  },
  users: {},
}));

import { withTenant, TenantMismatchError } from '../with-tenant';

describe('withTenant', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(new Headers());
  });

  it('returns resolved tenant when unauthenticated', async () => {
    mocks.resolveTenantFromRequestHeaders.mockResolvedValue({ id: 't1', slug: 'soralia' });
    mocks.getSession.mockResolvedValue(null);

    await expect(withTenant()).resolves.toEqual({ tenantId: 't1', tenantSlug: 'soralia' });
  });

  it('returns resolved tenant when session tenant matches', async () => {
    mocks.resolveTenantFromRequestHeaders.mockResolvedValue({ id: 't1', slug: 'soralia' });
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', tenantId: 't1' } });

    await expect(withTenant()).resolves.toEqual({ tenantId: 't1', tenantSlug: 'soralia' });
  });

  it('throws TenantMismatchError when session tenant differs', async () => {
    mocks.resolveTenantFromRequestHeaders.mockResolvedValue({
      id: 't2',
      slug: 'solaris-heights',
    });
    mocks.getSession.mockResolvedValue({ user: { id: 'u1', tenantId: 't1' } });

    await expect(withTenant()).rejects.toBeInstanceOf(TenantMismatchError);
  });

  it('allows platform admin when resolved tenant differs from home tenant', async () => {
    mocks.resolveTenantFromRequestHeaders.mockResolvedValue({
      id: 't2',
      slug: 'solaris-heights',
    });
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.dbSelect.mockResolvedValue([{ tenantId: 't1', isPlatformAdmin: true }]);

    await expect(withTenant()).resolves.toEqual({
      tenantId: 't2',
      tenantSlug: 'solaris-heights',
    });
  });

  it('skips cross-check when session user has no tenantId', async () => {
    mocks.resolveTenantFromRequestHeaders.mockResolvedValue({
      id: 't2',
      slug: 'solaris-heights',
    });
    mocks.getSession.mockResolvedValue({ user: { id: 'u1' } });
    mocks.dbSelect.mockResolvedValue([{ tenantId: null, isPlatformAdmin: false }]);

    await expect(withTenant()).resolves.toEqual({
      tenantId: 't2',
      tenantSlug: 'solaris-heights',
    });
  });
});
