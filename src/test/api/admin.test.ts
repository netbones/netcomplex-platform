/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

// ── Mock server-only ──
vi.mock('server-only', () => ({}));

// ── Mock next/headers ──
vi.mock('next/headers', () => ({
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((key: string) => {
        if (key === 'x-tenant-id') return 'test-tenant-id';
        if (key === 'x-tenant-slug') return 'test-tenant';
        return null;
      }),
    })
  ),
}));

// ── Hoisted mutable mocks ──
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string; name?: string } } | null,
  requirePlatformAdmin: vi.fn(),
  requireAnyPermission: vi.fn(),
  getSessionAndRole: vi.fn(),
  getRLSContext: vi.fn(),
  runWithRLS: vi.fn(),
  getTenantById: vi.fn(),
  updateTenant: vi.fn(),
  deleteTenant: vi.fn(),
  createTenant: vi.fn(),
  listTenants: vi.fn(),
  getPlatformPageFlagsWithTx: vi.fn(),
  setPlatformPageFlagWithTx: vi.fn(),
  writeAuditLog: vi.fn(),
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  },
  globalFetch: vi.fn(),
}));

// ── Drizzle chain builders (local, not from helpers, to support tx-scoped usage) ──
function makeSelectChain(result: unknown[]) {
  const promiseResult = Promise.resolve(result);

  // Unified thenable node — every chain method returns self so any
  // combination of .where().groupBy().orderBy(), etc. works and is
  // awaitable at any depth.
  const node: any = {
    then: (resolve: (v: unknown[]) => void, reject?: (e: Error) => void) =>
      promiseResult.then(resolve, reject),
    from: vi.fn(() => node),
    innerJoin: vi.fn(() => node),
    leftJoin: vi.fn(() => node),
    where: vi.fn(() => node),
    limit: vi.fn(() => node),
    orderBy: vi.fn(() => node),
    offset: vi.fn(() => node),
    groupBy: vi.fn(() => node),
  };

  return node;
}

function makeInsertChain(result: unknown[] = []) {
  const valuesPromise = Promise.resolve();
  return {
    values: vi.fn(() => ({
      then: (resolve: () => void) => valuesPromise.then(resolve),
      returning: vi.fn(() => Promise.resolve(result)),
    })),
  };
}

function makeUpdateChain(result: unknown[] = []) {
  const wherePromise = Promise.resolve();
  return {
    set: vi.fn(() => ({
      where: vi.fn(() => ({
        then: (resolve: () => void) => wherePromise.then(resolve),
        returning: vi.fn(() => Promise.resolve(result)),
      })),
    })),
  };
}

function makeDeleteChain() {
  return {
    where: vi.fn(() => Promise.resolve()),
  };
}

// ── Mock @api/server ──
vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: {
      api: {
        getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)),
      },
    },
    db: mocks.dbMock,

    // Tables / column refs
    settings: { id: 'id', tenantId: 'tenantId', key: 'key', value: 'value' },
    users: {
      id: 'id',
      role: 'role',
      name: 'name',
      email: 'email',
      tenantId: 'tenantId',
      createdAt: 'createdAt',
      isPlatformAdmin: 'isPlatformAdmin',
    },
    tenants: {
      id: 'id',
      ownerId: 'ownerId',
      name: 'name',
      slug: 'slug',
      tier: 'tier',
      customDomain: 'customDomain',
    },
    assistSessions: {
      id: 'id',
      tenantId: 'tenantId',
      staffId: 'staffId',
      scope: 'scope',
      expiresAt: 'expiresAt',
      isActive: 'isActive',
      notes: 'notes',
      createdAt: 'createdAt',
      revokedAt: 'revokedAt',
      revokedBy: 'revokedBy',
    },
    maintenanceRequests: {
      id: 'id',
      tenantId: 'tenantId',
      userId: 'userId',
      status: 'status',
      category: 'category',
      priority: 'priority',
      description: 'description',
      ticketNumber: 'ticketNumber',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
      completedAt: 'completedAt',
      scheduledDate: 'scheduledDate',
    },
    contents: {
      id: 'id',
      tenantId: 'tenantId',
      authorId: 'authorId',
      title: 'title',
      category: 'category',
      published: 'published',
      updatedAt: 'updatedAt',
    },
    surveys: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      status: 'status',
      endDate: 'endDate',
      updatedAt: 'updatedAt',
    },
    events: {
      id: 'id',
      tenantId: 'tenantId',
      title: 'title',
      date: 'date',
      location: 'location',
      updatedAt: 'updatedAt',
    },
    announcements: {
      id: 'id',
      tenantId: 'tenantId',
      expiresAt: 'expiresAt',
    },
    groupMembershipRequests: {
      id: 'id',
      tenantId: 'tenantId',
      status: 'status',
    },
    competitions: {
      id: 'id',
      tenantId: 'tenantId',
      status: 'status',
    },
    tenantModules: {
      tenantId: 'tenantId',
      moduleKey: 'moduleKey',
      enabled: 'enabled',
      config: 'config',
      enabledAt: 'enabledAt',
    },
    platformModules: {
      key: 'key',
      minTier: 'minTier',
      defaultEnabled: 'defaultEnabled',
    },

    // RLS helpers
    runWithRLS: (ctx: any, fn: any) => mocks.runWithRLS(ctx, fn),
    getRLSContext: (request: any) => mocks.getRLSContext(request),
    getSessionAndRole: (request?: any) => mocks.getSessionAndRole(request),
    requireAnyPermission: (perms: string[]) => mocks.requireAnyPermission(perms),

    // Revalidation
    revalidateDashboard: vi.fn(),
    revalidateContent: vi.fn(),

    // Audit
    writeAuditLog: (entry: any) => mocks.writeAuditLog(entry),

    // Response helpers
    apiSuccess: (data: unknown, meta?: unknown, status = 200, init?: ResponseInit) => {
      const body: any = { success: true, data };
      if (meta !== undefined) body.meta = meta;
      return NextResponse.json(body, { status, ...(init || {}) }) as any;
    },
    apiCreated: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 201 }) as any,
    apiError: (code: string, message: string, status: number, details?: unknown) => {
      const err: any = { code, message };
      if (details !== undefined) err.details = details;
      return NextResponse.json({ success: false, error: err }, { status }) as any;
    },
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json(
        { success: false, error: { code: 'AUTH_REQUIRED', message } },
        { status: 401 }
      ) as any,
    apiForbidden: (message = 'Forbidden') =>
      NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message } },
        { status: 403 }
      ) as any,
    apiNotFound: (message = 'Not found') =>
      NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message } },
        { status: 404 }
      ) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json(
        { success: false, error: { code: 'INTERNAL_ERROR', message } },
        { status: 500 }
      ) as any,
    apiConflict: (message = 'Resource conflict') =>
      NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message } },
        { status: 409 }
      ) as any,
    apiValidationError: (details?: unknown) =>
      NextResponse.json(
        {
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        },
        { status: 422 }
      ) as any,
  };
});

// ── Mock @entities/tenant ──
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
  requirePlatformAdmin: (request: any) => mocks.requirePlatformAdmin(request),
  listTenants: () => mocks.listTenants(),
  createTenant: (data: unknown) => mocks.createTenant(data),
  getTenantById: (id: string) => mocks.getTenantById(id),
  updateTenant: (id: string, data: unknown) => mocks.updateTenant(id, data),
  deleteTenant: (id: string) => mocks.deleteTenant(id),
  getPlatformPageFlagsWithTx: (tx: any, tenantId: string) =>
    mocks.getPlatformPageFlagsWithTx(tx, tenantId),
  setPlatformPageFlagWithTx: (tx: any, tenantId: string, key: any, value: any) =>
    mocks.setPlatformPageFlagWithTx(tx, tenantId, key, value),
  TIERS: {
    foundation: { maxPages: 5 },
    depth: { maxPages: 10 },
    core: { maxPages: 20 },
  },
  isModuleEnabled: vi.fn(),
  getEnabledModules: vi.fn(() => []),
}));

// ── Mock @shared/lib ──
vi.mock('@shared/lib', () => ({
  logError: vi.fn(),
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  createComponentLogger: () => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  }),
  isAdmin: (role: string | null | undefined) => {
    if (!role) return false;
    return ['ADMIN', 'BOARD'].includes(role);
  },
}));

// ── Import route handlers after all mocks are in place ──
import { POST as ONBOARDING_POST } from '@/app/api/platform/onboarding/route';
import { POST as SIGNUP_POST } from '@/app/api/platform/tenants/route';
import { GET as ACTIVITY_GET } from '@/app/api/admin/activity/route';
import { GET as BOARD_MEMBERS_GET } from '@/app/api/admin/board-members/route';
import { GET as URGENCY_GET } from '@/app/api/admin/urgency/route';
import { GET as MAINTENANCE_STATS_GET } from '@/app/api/admin/maintenance-stats/route';
import {
  GET as PAGE_FLAGS_GET,
  POST as PAGE_FLAGS_POST,
} from '@/app/api/admin/settings/page-flags/route';
import {
  GET as TENANT_SINGLE_GET,
  PATCH as TENANT_SINGLE_PATCH,
  DELETE as TENANT_SINGLE_DELETE,
} from '@/app/api/admin/platform/tenants/[id]/route';
import { PATCH as ASSIST_EXTEND } from '@/app/api/admin/platform/assist/[id]/route';
import { GET as MODULES_GET } from '@/app/api/tenants/[id]/modules/route';

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

const DEFAULT_RLS_CTX = {
  userId: 'user-1',
  tenantId: 'test-tenant-id',
  role: 'ADMIN',
  isPlatformAdmin: false,
};

describe('Admin & Platform API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default auth: no session
    mocks.sessionResult = null;

    // Default guards: pass
    mocks.requirePlatformAdmin.mockResolvedValue(null);
    mocks.requireAnyPermission.mockResolvedValue(null);
    mocks.getSessionAndRole.mockResolvedValue(null);

    // Default RLS: authenticated ADMIN
    mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX });
    mocks.runWithRLS.mockImplementation(async (_ctx: any, fn: any) => fn(mocks.dbMock));

    // Default entity mocks
    mocks.getTenantById.mockResolvedValue({ id: 'tenant-1', name: 'Test', slug: 'test' });
    mocks.updateTenant.mockResolvedValue({ id: 'tenant-1', name: 'Updated', slug: 'test' });
    mocks.deleteTenant.mockResolvedValue(undefined);
    mocks.createTenant.mockResolvedValue({ id: 'new-tenant', name: 'New', slug: 'new-tenant' });
    mocks.listTenants.mockResolvedValue([{ id: 't1', name: 'Tenant 1', slug: 't1' }]);
    mocks.getPlatformPageFlagsWithTx.mockResolvedValue({
      campaign: true,
      conservation: 'default',
      conservationExternalUrl: '',
      chat: true,
      news: true,
      events: true,
      directory: true,
      groups: true,
      services: true,
      resources: true,
      maintenance: true,
      surveys: true,
      competitions: true,
    });
    mocks.setPlatformPageFlagWithTx.mockResolvedValue(true);
    mocks.writeAuditLog.mockReturnValue(undefined);

    // Default DB chain mocks
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
    mocks.dbMock.insert.mockReturnValue(makeInsertChain([]));
    mocks.dbMock.update.mockReturnValue(makeUpdateChain([]));
    mocks.dbMock.delete.mockReturnValue(makeDeleteChain());
    mocks.dbMock.transaction.mockImplementation(async (fn: any) => fn(mocks.dbMock));

    // Default global fetch
    mocks.globalFetch.mockReset();
    vi.stubGlobal('fetch', mocks.globalFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 1. POST /api/platform/onboarding
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST /api/platform/onboarding', () => {
    it('rejects requests with missing tenantId', async () => {
      const request = new Request('http://localhost/api/platform/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: 1, data: { name: 'Test' } }),
      });

      const response = await ONBOARDING_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.error).toContain('tenantId');
    });

    it('rejects requests with missing step', async () => {
      const request = new Request('http://localhost/api/platform/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1', data: { name: 'Test' } }),
      });

      const response = await ONBOARDING_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.error).toContain('step');
    });

    it('saves step data and returns success', async () => {
      const request = new Request('http://localhost/api/platform/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1', step: 1, data: { name: 'Test' } }),
      });

      const response = await ONBOARDING_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.dbMock.transaction).toHaveBeenCalled();
      expect((body as any).data.success).toBe(true);
      expect((body as any).data.step).toBe(1);
    });

    it('marks onboarding as complete when step 5 is saved', async () => {
      const request = new Request('http://localhost/api/platform/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1', step: 5, data: { completed: true } }),
      });

      const response = await ONBOARDING_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(mocks.dbMock.transaction).toHaveBeenCalled();
      expect((body as any).data.success).toBe(true);
      expect((body as any).data.step).toBe(5);
    });

    it('returns 500 on internal error', async () => {
      mocks.dbMock.transaction.mockRejectedValue(new Error('DB error'));

      const request = new Request('http://localhost/api/platform/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: 'tenant-1', step: 1, data: { name: 'Test' } }),
      });

      const response = await ONBOARDING_POST(request as any);
      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. POST /api/platform/tenants — tenant signup (public)
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST /api/platform/tenants', () => {
    const validSignup = {
      name: 'My Community',
      slug: 'my-community',
      plan: 'foundation',
      admin: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        password: 'securePass123',
      },
    };

    it('rejects invalid subscription plan', async () => {
      const request = new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...validSignup, plan: 'invalid_plan' }),
      });

      const response = await SIGNUP_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect((body as any).error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects duplicate subdomain/slug', async () => {
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([{ id: 'existing', slug: 'my-community' }])
      );

      const request = new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignup),
      });

      const response = await SIGNUP_POST(request as any);
      expect(response.status).toBe(409);
    });

    it('rejects duplicate email', async () => {
      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        return makeSelectChain(
          callCount === 1 ? [] : [{ id: 'existing-user', email: 'john@example.com' }]
        );
      });

      const request = new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignup),
      });

      const response = await SIGNUP_POST(request as any);
      expect(response.status).toBe(409);
    });

    it('creates tenant and user on successful signup', async () => {
      // Empty results for existing tenant/email checks
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      // Mock Better Auth response
      mocks.globalFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { id: 'new-user-id' } }),
      });

      // Mock the insert inside the transaction to return a new tenant row
      mocks.dbMock.insert.mockReturnValue(
        makeInsertChain([{ id: 'created-tenant-id', name: 'My Community', slug: 'my-community' }])
      );

      // Mock getTenantById for the linked tenant fetch
      mocks.getTenantById.mockResolvedValue({
        id: 'created-tenant-id',
        name: 'My Community',
        slug: 'my-community',
      });

      const request = new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignup),
      });

      const response = await SIGNUP_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.tenant.name).toBe('My Community');
      expect((body as any).data.user.email).toBe('john@example.com');
      expect(mocks.dbMock.transaction).toHaveBeenCalled();
    });

    it('returns 500 on internal error', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
      mocks.globalFetch.mockRejectedValue(new Error('Network error'));

      const request = new Request('http://localhost/api/platform/tenants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(validSignup),
      });

      const response = await SIGNUP_POST(request as any);
      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. GET /api/admin/activity
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/activity', () => {
    it('returns 401 when no RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new NextRequest('http://localhost/api/admin/activity');
      const response = await ACTIVITY_GET(request as any);

      expect(response.status).toBe(401);
    });

    it('returns 403 when permission check fails', async () => {
      mocks.requireAnyPermission.mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const request = new NextRequest('http://localhost/api/admin/activity');
      const response = await ACTIVITY_GET(request as any);

      expect(response.status).toBe(403);
    });

    it('returns activity feed with valid auth', async () => {
      const now = new Date();
      const feedItem = {
        id: 'item-1',
        domain: 'maintenance',
        action: 'submitted',
        resourceLabel: 'Fix leak',
        actorId: 'user-1',
        createdAt: now,
        metadata: JSON.stringify({ status: 'SUBMITTED' }),
      };

      let selectCalls = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectCalls++;
        if (selectCalls <= 5) return makeSelectChain([feedItem]);
        return makeSelectChain([{ id: 'user-1', name: 'John Doe' }]);
      });

      const request = new NextRequest('http://localhost/api/admin/activity');
      const response = await ACTIVITY_GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.items).toBeDefined();
      expect((body as any).data.items.length).toBeGreaterThan(0);
    });

    it('supports domain filter query param', async () => {
      const feedItem = {
        id: 'item-1',
        domain: 'maintenance',
        action: 'submitted',
        resourceLabel: 'Fix leak',
        actorId: null,
        createdAt: new Date(),
        metadata: JSON.stringify({ status: 'SUBMITTED' }),
      };

      mocks.dbMock.select.mockImplementation(() => {
        return makeSelectChain([feedItem]);
      });

      const request = new NextRequest('http://localhost/api/admin/activity?domain=maintenance');
      const response = await ACTIVITY_GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.items).toBeDefined();
    });

    it('returns nextCursor for full pages', async () => {
      const now = new Date();
      const items = Array.from({ length: 20 }, (_, i) => ({
        id: `item-${i}`,
        domain: 'maintenance',
        action: 'submitted',
        resourceLabel: `Fix leak #${i}`,
        actorId: null,
        createdAt: new Date(now.getTime() - i * 1000),
        metadata: JSON.stringify({ status: 'SUBMITTED' }),
      }));

      let selectCalls = 0;
      mocks.dbMock.select.mockImplementation(() => {
        selectCalls++;
        if (selectCalls <= 5) return makeSelectChain(items);
        return makeSelectChain([]);
      });

      const request = new NextRequest('http://localhost/api/admin/activity');
      const response = await ACTIVITY_GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.nextCursor).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 4. GET /api/admin/board-members
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/board-members', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/board-members');
      const response = await BOARD_MEMBERS_GET(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-board/admin role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'RESIDENT' });

      const request = new Request('http://localhost/api/admin/board-members');
      const response = await BOARD_MEMBERS_GET(request);

      expect(response.status).toBe(403);
    });

    it('returns board members for BOARD role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'BOARD' });
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([
          { id: 'u1', name: 'Alice', email: 'alice@test.com', role: 'BOARD' },
          { id: 'u2', name: 'Bob', email: 'bob@test.com', role: 'ADMIN' },
        ])
      );

      const request = new Request('http://localhost/api/admin/board-members');
      const response = await BOARD_MEMBERS_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data).toHaveLength(2);
    });

    it('returns board members for ADMIN role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'ADMIN' });
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([{ id: 'u3', name: 'Carol', email: 'carol@test.com', role: 'COMMITTEE' }])
      );

      const request = new Request('http://localhost/api/admin/board-members');
      const response = await BOARD_MEMBERS_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 5. GET /api/admin/urgency
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/urgency', () => {
    it('returns 401 when no RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/urgency');
      const response = await URGENCY_GET(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 when permission check fails', async () => {
      mocks.requireAnyPermission.mockResolvedValue(
        new Response(
          JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message: 'Forbidden' } }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      );

      const request = new Request('http://localhost/api/admin/urgency');
      const response = await URGENCY_GET(request);

      expect(response.status).toBe(403);
    });

    it('returns urgency dashboard counts', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ count: 5 }]));

      const request = new Request('http://localhost/api/admin/urgency');
      const response = await URGENCY_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.commandBar).toBeDefined();
      expect((body as any).data.domainBadges).toBeDefined();
    });

    it('handles zero-count results gracefully', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ count: 0 }]));

      const request = new Request('http://localhost/api/admin/urgency');
      const response = await URGENCY_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.commandBar.openMaintenance).toBe(0);
      expect((body as any).data.domainBadges.maintenance).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 6. GET /api/admin/maintenance-stats
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/maintenance-stats', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/maintenance-stats');
      const response = await MAINTENANCE_STATS_GET(request);

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-board/admin role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'RESIDENT' });

      const request = new Request('http://localhost/api/admin/maintenance-stats');
      const response = await MAINTENANCE_STATS_GET(request);

      expect(response.status).toBe(403);
    });

    it('returns maintenance stats overview for board role', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'BOARD' });

      // 8 parallel queries + 1 trend query
      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ count: 3 }]));

      const request = new Request('http://localhost/api/admin/maintenance-stats');
      const response = await MAINTENANCE_STATS_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.overview).toBeDefined();
      expect((body as any).data.byStatus).toBeDefined();
      expect((body as any).data.byPriority).toBeDefined();
      expect((body as any).data.byCategory).toBeDefined();
      expect((body as any).data.trend).toBeDefined();
    });

    it('handles empty stat results', async () => {
      mocks.getRLSContext.mockResolvedValue({ ...DEFAULT_RLS_CTX, role: 'ADMIN' });
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const request = new Request('http://localhost/api/admin/maintenance-stats');
      const response = await MAINTENANCE_STATS_GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.overview.totalOpen).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 7. GET /api/admin/settings/page-flags
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/settings/page-flags', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/settings/page-flags');
      const response = await PAGE_FLAGS_GET(request as any);

      expect(response.status).toBe(401);
    });

    it('returns page flags for authenticated user', async () => {
      const flags = {
        campaign: true,
        conservation: 'default',
        conservationExternalUrl: '',
        chat: true,
        news: true,
        events: true,
        directory: true,
        groups: true,
        services: true,
        resources: true,
        maintenance: true,
        surveys: true,
        competitions: true,
      };
      mocks.getPlatformPageFlagsWithTx.mockResolvedValue(flags);

      const request = new Request('http://localhost/api/admin/settings/page-flags');
      const response = await PAGE_FLAGS_GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data).toEqual(flags);
    });

    it('verifies flag data structure', async () => {
      const flags = { campaign: false, chat: false, news: true };
      mocks.getPlatformPageFlagsWithTx.mockResolvedValue(flags);

      const request = new Request('http://localhost/api/admin/settings/page-flags');
      const response = await PAGE_FLAGS_GET(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.campaign).toBe(false);
      expect((body as any).data.chat).toBe(false);
      expect((body as any).data.news).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 8. POST /api/admin/settings/page-flags
  // ═══════════════════════════════════════════════════════════════════════
  describe('POST /api/admin/settings/page-flags', () => {
    it('returns 401 without RLS context', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ role: 'ADMIN' } as any);
      mocks.getRLSContext.mockResolvedValue(null);

      const request = new Request('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'campaign', value: false }),
      });
      const response = await PAGE_FLAGS_POST(request as any);

      expect(response.status).toBe(401);
    });

    it('returns 403 for non-admin role', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ role: 'RESIDENT' } as any);

      const request = new Request('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'campaign', value: false }),
      });
      const response = await PAGE_FLAGS_POST(request as any);

      expect(response.status).toBe(403);
    });

    it('updates a valid page flag key', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ role: 'ADMIN' } as any);

      const request = new Request('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'campaign', value: false }),
      });
      const response = await PAGE_FLAGS_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.success).toBe(true);
      expect((body as any).data.key).toBe('campaign');
      expect((body as any).data.value).toBe(false);
      expect(mocks.setPlatformPageFlagWithTx).toHaveBeenCalledWith(
        expect.anything(),
        'test-tenant-id',
        'campaign',
        false
      );
    });

    it('rejects invalid flag key', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ role: 'ADMIN' } as any);

      const request = new Request('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'invalid_key', value: true }),
      });
      const response = await PAGE_FLAGS_POST(request as any);
      const body = await response.json();

      expect(response.status).toBe(400);
      expect((body as any).error.message).toBe('Invalid key');
    });

    it('returns 500 when flag update fails', async () => {
      mocks.getSessionAndRole.mockResolvedValue({ role: 'ADMIN' } as any);
      mocks.setPlatformPageFlagWithTx.mockResolvedValue(false);

      const request = new Request('http://localhost/api/admin/settings/page-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'chat', value: false }),
      });
      const response = await PAGE_FLAGS_POST(request as any);

      expect(response.status).toBe(500);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 9. GET /api/admin/platform/tenants/[id]
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/admin/platform/tenants/[id]', () => {
    it('returns 403 for non-platform-admin', async () => {
      mocks.requirePlatformAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden - Platform Admin access required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1');

      const response = await TENANT_SINGLE_GET(request as any, { params });
      expect(response.status).toBe(403);
    });

    it('returns 404 for nonexistent tenant', async () => {
      mocks.getTenantById.mockResolvedValue(undefined);

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/admin/platform/tenants/nonexistent');

      const response = await TENANT_SINGLE_GET(request as any, { params });
      expect(response.status).toBe(404);
    });

    it('returns tenant for platform admin', async () => {
      const tenant = { id: 'tenant-1', name: 'Test Tenant', slug: 'test-tenant' };
      mocks.getTenantById.mockResolvedValue(tenant);

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1');

      const response = await TENANT_SINGLE_GET(request as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data).toEqual(tenant);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 10. PATCH /api/admin/platform/tenants/[id]
  // ═══════════════════════════════════════════════════════════════════════
  describe('PATCH /api/admin/platform/tenants/[id]', () => {
    it('returns 403 for non-platform-admin', async () => {
      mocks.requirePlatformAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await TENANT_SINGLE_PATCH(request as any, { params });
      expect(response.status).toBe(403);
    });

    it('updates tenant and writes audit log', async () => {
      const tenant = { id: 'tenant-1', name: 'Updated Name', slug: 'test-tenant' };
      mocks.updateTenant.mockResolvedValue(tenant);
      mocks.sessionResult = { user: { id: 'admin-1' } };

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated Name' }),
      });

      const response = await TENANT_SINGLE_PATCH(request as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data).toEqual(tenant);
      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'TENANT_UPDATED',
          targetId: 'tenant-1',
        })
      );
      expect(mocks.updateTenant).toHaveBeenCalledWith(
        'tenant-1',
        expect.objectContaining({ name: 'Updated Name' })
      );
    });

    it('records audit log with actorId', async () => {
      mocks.sessionResult = { user: { id: 'platform-admin-user' } };
      mocks.updateTenant.mockResolvedValue({ id: 'tenant-1', name: 'X', slug: 'x' });

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });

      await TENANT_SINGLE_PATCH(request as any, { params });

      expect(mocks.writeAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'platform-admin-user',
          details: expect.objectContaining({ updatedFields: ['active'] }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 11. DELETE /api/admin/platform/tenants/[id]
  // ═══════════════════════════════════════════════════════════════════════
  describe('DELETE /api/admin/platform/tenants/[id]', () => {
    it('returns 403 for non-platform-admin', async () => {
      mocks.requirePlatformAdmin.mockResolvedValue(
        new Response(JSON.stringify({ error: 'Forbidden' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1', {
        method: 'DELETE',
      });

      const response = await TENANT_SINGLE_DELETE(request as any, { params });
      expect(response.status).toBe(403);
    });

    it('deletes tenant for platform admin', async () => {
      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/admin/platform/tenants/tenant-1', {
        method: 'DELETE',
      });

      const response = await TENANT_SINGLE_DELETE(request as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.success).toBe(true);
      expect(mocks.deleteTenant).toHaveBeenCalledWith('tenant-1');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 12. PATCH /api/admin/platform/assist/[id]
  // ═══════════════════════════════════════════════════════════════════════
  describe('PATCH /api/admin/platform/assist/[id]', () => {
    it('returns 401 without session', async () => {
      mocks.sessionResult = null;

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: new Date(Date.now() + 3600000).toISOString() }),
      });

      const response = await ASSIST_EXTEND(request as any, { params });
      expect(response.status).toBe(401);
    });

    it('returns 403 for non-platform-admin', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      mocks.dbMock.select.mockReturnValue(makeSelectChain([{ isPlatformAdmin: false }]));

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: new Date(Date.now() + 3600000).toISOString() }),
      });

      const response = await ASSIST_EXTEND(request as any, { params });
      expect(response.status).toBe(403);
    });

    it('returns 404 for nonexistent assist session', async () => {
      mocks.sessionResult = { user: { id: 'admin-1' } };

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([]);
      });

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/admin/platform/assist/nonexistent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: new Date(Date.now() + 3600000).toISOString() }),
      });

      const response = await ASSIST_EXTEND(request as any, { params });
      expect(response.status).toBe(404);
    });

    it('extends assist session for platform admin', async () => {
      mocks.sessionResult = { user: { id: 'admin-1' } };
      const newExpiresAt = new Date(Date.now() + 3600000);

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([
          { id: 'assist-1', tenantId: 'tenant-1', isActive: true, expiresAt: new Date() },
        ]);
      });

      mocks.dbMock.update.mockReturnValue(
        makeUpdateChain([{ id: 'assist-1', expiresAt: newExpiresAt }])
      );

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresAt: newExpiresAt.toISOString() }),
      });

      const response = await ASSIST_EXTEND(request as any, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.id).toBe('assist-1');
    });

    it('returns 400 when expiresAt is missing', async () => {
      mocks.sessionResult = { user: { id: 'admin-1' } };

      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ isPlatformAdmin: true }]);
        return makeSelectChain([
          { id: 'assist-1', tenantId: 'tenant-1', isActive: true, expiresAt: new Date() },
        ]);
      });

      const params = Promise.resolve({ id: 'assist-1' });
      const request = new Request('http://localhost/api/admin/platform/assist/assist-1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const response = await ASSIST_EXTEND(request as any, { params });
      const body = await response.json();

      expect(response.status).toBe(400);
      expect((body as any).error.message).toBe('expiresAt is required');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 13. GET /api/tenants/[id]/modules
  // ═══════════════════════════════════════════════════════════════════════
  describe('GET /api/tenants/[id]/modules', () => {
    it('returns 404 for nonexistent tenant', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const params = Promise.resolve({ id: 'nonexistent' });
      const request = new Request('http://localhost/api/tenants/nonexistent/modules');

      const response = await MODULES_GET(request, { params });
      expect(response.status).toBe(404);
    });

    it('returns enabled modules for valid tenant', async () => {
      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ id: 'tenant-1', tier: 'STANDARD' }]);
        if (callCount === 2)
          return makeSelectChain([
            { key: 'bookings', minTier: 'STANDARD', defaultEnabled: true },
            { key: 'chat', minTier: 'STANDARD', defaultEnabled: true },
            { key: 'analytics', minTier: 'PREMIUM', defaultEnabled: false },
          ]);
        return makeSelectChain([]);
      });

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/tenants/tenant-1/modules');

      const response = await MODULES_GET(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.bookings).toBeDefined();
      expect((body as any).data.chat).toBeDefined();
    });

    it('excludes modules above tenant tier', async () => {
      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ id: 'tenant-1', tier: 'STANDARD' }]);
        if (callCount === 2)
          return makeSelectChain([
            { key: 'basic', minTier: 'STANDARD', defaultEnabled: true },
            { key: 'premium', minTier: 'PREMIUM', defaultEnabled: false },
            { key: 'enterprise', minTier: 'ENTERPRISE', defaultEnabled: false },
          ]);
        return makeSelectChain([]);
      });

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/tenants/tenant-1/modules');

      const response = await MODULES_GET(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.basic).toBeDefined();
      expect((body as any).data.premium).toBeUndefined();
      expect((body as any).data.enterprise).toBeUndefined();
    });

    it('reflects explicit tenant-level module overrides', async () => {
      let callCount = 0;
      mocks.dbMock.select.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return makeSelectChain([{ id: 'tenant-1', tier: 'STANDARD' }]);
        if (callCount === 2)
          return makeSelectChain([
            { key: 'bookings', minTier: 'STANDARD', defaultEnabled: true },
            { key: 'chat', minTier: 'STANDARD', defaultEnabled: true },
          ]);
        return makeSelectChain([
          {
            tenantId: 'tenant-1',
            moduleKey: 'chat',
            enabled: false,
            config: null,
            enabledAt: new Date('2026-01-01'),
          },
        ]);
      });

      const params = Promise.resolve({ id: 'tenant-1' });
      const request = new Request('http://localhost/api/tenants/tenant-1/modules');

      const response = await MODULES_GET(request, { params });
      const body = await response.json();

      expect(response.status).toBe(200);
      expect((body as any).data.bookings.enabled).toBe(true);
      expect((body as any).data.chat.enabled).toBe(false);
      expect((body as any).data.chat.enabledAt).toBeDefined();
    });
  });
});
