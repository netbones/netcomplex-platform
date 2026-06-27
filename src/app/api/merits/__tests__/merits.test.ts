import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('server-only', () => ({}));

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

const mocks = vi.hoisted(() => ({
  tenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  authSession: null as { user: { id: string; role: string } } | null,
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
  },
  writeAuditLog: vi.fn(),
  getEffectivePointsResult: { recognition: 5, disciplinary: 0, overall: 5 },
  checkAndEscalateResult: { escalated: false },
  communityMerits: {
    id: 'id',
    tenantId: 'tenantId',
    userId: 'userId',
    behaviorType: 'behaviorType',
    category: 'category',
    reason: 'reason',
    description: 'description',
    recognitionPoints: 'recognitionPoints',
    disciplinaryPoints: 'disciplinaryPoints',
    standingBefore: 'standingBefore',
    standingAfter: 'standingAfter',
    status: 'status',
    createdById: 'createdById',
    createdAt: 'createdAt',
    deletedAt: 'deletedAt',
    expiresAt: 'expiresAt',
    $inferInsert: {} as Record<string, unknown>,
  },
}));

vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mocks.authSession)),
    },
  },
  db: mocks.dbMock,
  communityMerits: mocks.communityMerits,
  apiUnauthorized: vi.fn(
    (message = 'Unauthorized') =>
      new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message } }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiForbidden: vi.fn(
    (message = 'Forbidden') =>
      new Response(JSON.stringify({ success: false, error: { code: 'FORBIDDEN', message } }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiCreated: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string, status: number = 500) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiSuccess: vi.fn(
    (data: unknown, meta?: unknown) =>
      new Response(JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
  writeAuditLog: (...args: unknown[]) => mocks.writeAuditLog(...args),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

vi.mock('@shared/lib', () => ({
  hasPermission: vi.fn(() => true),
}));

vi.mock('@entities/merit', () => ({
  BEHAVIOR_POINTS: { MERIT: 5, WARNING: 2, INFRACTION: 10 },
  DEFAULT_EXPIRY_DAYS: { MERIT: null, WARNING: 180, INFRACTION: 730 },
}));

vi.mock('@/entities/merit/services', () => ({
  getEffectivePoints: vi.fn(() => Promise.resolve(mocks.getEffectivePointsResult)),
  checkAndEscalateStanding: vi.fn(() => Promise.resolve(mocks.checkAndEscalateResult)),
}));

import { GET, POST } from '@/app/api/merits/route';
import { makeSelectChain } from './helpers';

describe('Merits API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authSession = { user: { id: 'admin-1', role: 'ADMIN' } };
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
    mocks.getEffectivePointsResult = { recognition: 5, disciplinary: 0, overall: 5 };
    mocks.checkAndEscalateResult = { escalated: false };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET', () => {
    it('returns paginated behavior records', async () => {
      const record = {
        id: 'r1',
        tenantId: 'test-tenant-id',
        userId: 'user-1',
        behaviorType: 'MERIT',
        category: 'COMMUNITY_SERVICE',
        reason: 'Helped clean common area',
        status: 'ACTIVE',
      };
      mocks.dbMock.select.mockReturnValue(
        makeSelectChain([{ ...record, createdAt: new Date('2026-06-21T10:00:00Z') }])
      );

      const response = await GET(new Request('http://localhost:3000/api/merits'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data[0]).toMatchObject(record);
      expect(body.data[0].createdAt).toBe('2026-06-21T10:00:00.000Z');
      expect(body.meta).toEqual({ limit: 50, offset: 0 });
    });

    it('forwards query params (status, category, userId, limit, offset)', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET(
        new Request(
          'http://localhost:3000/api/merits?status=DISPUTED&category=NOISE&userId=u1&limit=10&offset=5'
        )
      );
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const response = await GET(new Request('http://localhost:3000/api/merits'));
      expect(response.status).toBe(401);
    });

    it('returns 403 without users permission', async () => {
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const response = await GET(new Request('http://localhost:3000/api/merits'));
      expect(response.status).toBe(403);
    });

    it('returns empty array when no records exist', async () => {
      mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

      const response = await GET(new Request('http://localhost:3000/api/merits'));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });
  });

  describe('POST', () => {
    it('creates a merit record', async () => {
      mocks.dbMock.insert.mockReturnValue({
        values: vi.fn(() => Promise.resolve()),
      });

      const response = await POST(
        new Request('http://localhost:3000/api/merits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-1',
            behaviorType: 'MERIT',
            category: 'COMMUNITY_SERVICE',
            reason: 'Helped clean common area',
            description: 'Went above and beyond',
          }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(201);
      expect(body.data).toMatchObject({ standingBefore: 5, standingAfter: 10 });
      expect(body.data.id).toBeDefined();
    });

    it('returns 400 when required fields are missing', async () => {
      const response = await POST(
        new Request('http://localhost:3000/api/merits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'user-1' }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 400 for invalid behaviorType', async () => {
      const response = await POST(
        new Request('http://localhost:3000/api/merits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-1',
            behaviorType: 'INVALID_TYPE',
            reason: 'test',
          }),
        })
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('returns 401 without auth session', async () => {
      mocks.authSession = null;

      const response = await POST(
        new Request('http://localhost:3000/api/merits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-1',
            behaviorType: 'MERIT',
            reason: 'test',
          }),
        })
      );
      expect(response.status).toBe(401);
    });

    it('returns 403 without users permission', async () => {
      const { hasPermission } = await import('@shared/lib');
      vi.mocked(hasPermission).mockReturnValueOnce(false);

      const response = await POST(
        new Request('http://localhost:3000/api/merits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user-1',
            behaviorType: 'MERIT',
            reason: 'test',
          }),
        })
      );
      expect(response.status).toBe(403);
    });
  });
});
