import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string; email: string; name: string } } | null,
  moduleEnabled: true as boolean,
  /** alternates: [userRole[], suspension[]] indexed by callCounter */
  selectResults: [[{ role: 'RESIDENT' }], []] as [unknown[], unknown[]],
  callCounter: 0,
}));

vi.mock('@api/auth', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
    },
  },
}));

vi.mock('@api/db', () => {
  const makeThenable = (result: unknown[]) => {
    const p = Promise.resolve(result);
    return {
      then: (resolve: (v: unknown[]) => void) => p.then(resolve),
      catch: (reject: (e: Error) => void) => p.catch(reject),
      limit: vi.fn(() => p),
      orderBy: vi.fn(() => p),
    };
  };

  const makeFromChain = (result: unknown[]) => {
    const whereResult = makeThenable(result);
    return {
      where: vi.fn(() => whereResult),
      innerJoin: vi.fn(() => ({
        where: vi.fn(() => whereResult),
      })),
    };
  };

  return {
    db: {
      select: vi.fn(() => {
        const idx = Math.min(mocks.callCounter, mocks.selectResults.length - 1);
        const result = mocks.selectResults[idx];
        mocks.callCounter++;
        return { from: vi.fn(() => makeFromChain(result)) };
      }),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve({})),
        })),
      })),
    },
    users: { id: 'id', role: 'role', isActive: 'isActive' },
    tenants: { slug: 'slug', id: 'id' },
    platformSuspensions: {
      id: 'id',
      userId: 'userId',
      tenantId: 'tenantId',
      suspensionType: 'suspensionType',
      reason: 'reason',
      description: 'description',
      startDate: 'startDate',
      endDate: 'endDate',
      isPermanent: 'isPermanent',
      isActive: 'isActive',
      createdById: 'createdById',
      updatedAt: 'updatedAt',
    },
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test' })),
  isModuleEnabled: vi.fn(() => Promise.resolve(mocks.moduleEnabled)),
  assertModuleEnabled: vi.fn(() => {
    if (!mocks.moduleEnabled) {
      return Promise.resolve(
        new Response(JSON.stringify({ error: 'FEATURE_DISABLED' }), { status: 403 })
      );
    }
    return Promise.resolve(null);
  }),
}));

import { requireAuth, checkUserSuspension } from '../auth-utils';

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.moduleEnabled = true;
    mocks.callCounter = 0;
    mocks.selectResults = [[{ role: 'RESIDENT' }], []];
  });

  it('returns 401 when no session exists', async () => {
    const request = new Request('http://localhost/api/test');
    const result = await requireAuth(request);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns auth data on success', async () => {
    mocks.sessionResult = { user: { id: 'user-1', email: 'a@b.com', name: 'Test' } };
    mocks.selectResults = [[{ role: 'RESIDENT' }], []];

    const request = new Request('http://localhost/api/test');
    const result = await requireAuth(request);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('user-1');
      expect(result.data.role).toBe('RESIDENT');
    }
  });

  it('returns 403 when user lacks required permission', async () => {
    mocks.sessionResult = { user: { id: 'user-1', email: 'a@b.com', name: 'Test' } };

    const request = new Request('http://localhost/api/test');
    const result = await requireAuth(request, { permission: 'admin' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns 403 when module is disabled', async () => {
    mocks.sessionResult = { user: { id: 'user-1', email: 'a@b.com', name: 'Test' } };
    mocks.selectResults = [[{ role: 'ADMIN' }], []];
    mocks.moduleEnabled = false;

    const request = new Request('http://localhost/api/test');
    const result = await requireAuth(request, { module: 'resources' });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(403);
    }
  });

  it('returns auth data when permission and module both pass', async () => {
    mocks.sessionResult = { user: { id: 'user-1', email: 'a@b.com', name: 'Test' } };
    mocks.selectResults = [[{ role: 'ADMIN' }], []];

    const request = new Request('http://localhost/api/test');
    const result = await requireAuth(request, { permission: 'admin', module: 'resources' });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.userId).toBe('user-1');
    }
  });
});

describe('checkUserSuspension', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.callCounter = 0;
    mocks.selectResults = [[], []];
  });

  it('returns null when no active suspension found', async () => {
    mocks.selectResults = [[], []];

    const result = await checkUserSuspension('user-1', 'tenant-1');
    expect(result).toBeNull();
  });

  it('returns suspension info when active suspension exists', async () => {
    const suspension = {
      id: 'susp-1',
      suspensionType: 'TEMPORARY',
      reason: 'Violation',
      description: 'Test suspension',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      isPermanent: false,
      createdById: 'admin-1',
    };
    mocks.selectResults = [[suspension], []];

    const result = await checkUserSuspension('user-1', 'tenant-1');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('susp-1');
    expect(result?.reason).toBe('Violation');
  });

  it('returns null for expired suspension (auto-unsuspends)', async () => {
    const suspension = {
      id: 'susp-1',
      suspensionType: 'TEMPORARY',
      reason: 'Violation',
      description: null,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-06-01'),
      isPermanent: false,
      createdById: 'admin-1',
    };
    mocks.selectResults = [[suspension], []];

    const result = await checkUserSuspension('user-1', 'tenant-1');
    expect(result).toBeNull();
  });
});
