import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/headers
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

// Hoisted mocks for shared mutable state
const mocks = vi.hoisted(() => ({
  sessionResult: null as { user: { id: string } } | null,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  listMaintenanceRequests: vi.fn(),
  createMaintenanceRequest: vi.fn(),
}));

// Mock api/server — consolidated: auth, db, users, revalidation, and all API response helpers
vi.mock('@api/server', () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  db: mocks.dbMock,
  users: { id: 'id', role: 'role', name: 'name', email: 'email' },
  revalidateDashboard: vi.fn(),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
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
  apiUnauthorized: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'AUTH_REQUIRED', message: 'Authentication required' },
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiInternalError: vi.fn(
    () =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
  ),
  apiValidationError: vi.fn(
    (details?: unknown) =>
      new Response(
        JSON.stringify({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
        }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      )
  ),
}));

// Mock withTenant (consolidated — was split across 2 separate vi.mock calls)
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

// Mock maintenance services — keep real schema for validation, stub service fns
vi.mock('@entities/maintenance', async () => {
  const actual =
    await vi.importActual<typeof import('@entities/maintenance')>('@entities/maintenance');
  return {
    ...actual,
    listMaintenanceRequests: (...args: unknown[]) => mocks.listMaintenanceRequests(...args),
    createMaintenanceRequest: (...args: unknown[]) => mocks.createMaintenanceRequest(...args),
  };
});

// Mock logger + permissions
vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
  hasPermission: vi.fn((role: string | null | undefined, permission: string) => {
    if (!role) return false;
    if (permission === 'requests') return role === 'ADMIN' || role === 'MANAGER';
    return false;
  }),
}));

import { GET, POST } from '@/app/api/maintenance/route';
import { makeSelectChain, makeInsertChain, createMockRequest } from './helpers';

describe('Maintenance API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/maintenance', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/maintenance');
      const response = await GET(request);
      expect(response.status).toBe(401);
    });

    it('returns list with valid auth', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listMaintenanceRequests.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/maintenance');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listMaintenanceRequests).toHaveBeenCalled();
    });

    it('filters by status when query param provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listMaintenanceRequests.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/maintenance?status=SUBMITTED');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listMaintenanceRequests).toHaveBeenCalled();
    });

    it('enforces tenant isolation via withTenant', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listMaintenanceRequests.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/maintenance');
      await GET(request);

      expect(mocks.listMaintenanceRequests).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('returns empty array when no requests exist', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listMaintenanceRequests.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/maintenance');
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body.data).toEqual([]);
    });

    it('filters by priority when provided', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'ADMIN' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.listMaintenanceRequests.mockResolvedValue([]);

      const request = new Request('http://localhost:3000/api/maintenance?priority=HIGH');
      const response = await GET(request);

      expect(response.status).toBe(200);
      expect(mocks.listMaintenanceRequests).toHaveBeenCalledWith(
        expect.objectContaining({ priority: 'HIGH' })
      );
    });
  });

  describe('POST /api/maintenance', () => {
    it('returns 401 without auth', async () => {
      const request = new Request('http://localhost:3000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'PLUMBING',
          priority: 'HIGH',
          description: 'Leak in kitchen',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(401);
    });

    it('returns 422 for invalid input data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: 'PLUMBING', priority: 'HIGH', description: 'Short' }),
      });

      const response = await POST(request);
      expect(response.status).toBe(422);
    });

    it('creates request with valid data', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);
      mocks.createMaintenanceRequest.mockResolvedValue([
        { id: 'new-request', tenantId: 'test-tenant-id' },
      ]);

      const request = new Request('http://localhost:3000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'PLUMBING',
          priority: 'HIGH',
          description: 'Leaking tap in bathroom needs urgent attention',
        }),
      });

      const response = await POST(request);

      expect(response.status).toBe(201);
      expect(mocks.createMaintenanceRequest).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });

    it('enforces tenant isolation on create', async () => {
      mocks.sessionResult = { user: { id: 'user-1' } };

      const roleChain = makeSelectChain([{ role: 'RESIDENT' }]);
      mocks.dbMock.select.mockImplementation(() => roleChain);

      const request = new Request('http://localhost:3000/api/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'ELECTRICAL',
          priority: 'LOW',
          description: 'Power outlet not working in living room',
        }),
      });

      await POST(request);

      expect(mocks.createMaintenanceRequest).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: 'test-tenant-id' })
      );
    });
  });
});
