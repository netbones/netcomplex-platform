/**
 * Task 2 — POST /api/properties/[id]/delegate tests
 *
 * RED phase: failing tests for owner-initiated delegation.
 * Tests must FAIL before the route handler is implemented.
 */

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
  sessionResult: null as {
    session: { user: { id: string; email: string; name: string } };
    userId: string;
    role: string;
    suspension: null;
  } | null,
  withTenantResult: { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' },
  dbMock: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  propertyOwnerId: 'owner-user-1',
  providerExists: true,
  existingDelegation: null as unknown as unknown[],
  unknownScopes: [] as string[],
  scopeBundles: {
    'letting-agent': [
      'tenancy:read',
      'tenancy:manage',
      'tenancy:invite',
      'maintenance:read',
      'maintenance:coordinate',
      'listing:read',
      'listing:manage',
      'listing:market',
      'communication:contact_occupant',
      'financials:read',
    ],
    'maintenance-contractor': [
      'maintenance:read',
      'maintenance:coordinate',
      'inspection:view',
      'communication:notify_occupant',
    ],
    inspector: [
      'inspection:schedule',
      'inspection:record',
      'inspection:view',
      'documents:read',
      'maintenance:read',
    ],
    'property-manager': [
      'tenancy:read',
      'tenancy:manage',
      'maintenance:read',
      'maintenance:manage',
      'maintenance:approve',
      'inspection:view',
      'documents:read',
      'documents:upload',
      'financials:read',
    ],
  } as Record<string, string[]>,
}));

// ── Mock @api/server ──────────────────────────────────────────
vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  users: { id: 'id', role: 'role' },
  properties: {
    id: 'id',
    tenantId: 'tenantId',
    ownerId: 'ownerId',
    street: 'street',
    unit: 'unit',
  },
  agentAccesses: {
    id: 'id',
    tenantId: 'tenantId',
    agentId: 'agentId',
    propertyId: 'propertyId',
    status: 'status',
  },
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
  apiSuccess: vi.fn((data: unknown, _meta?: unknown, status?: number) =>
    Response.json({ success: true, data }, { status: typeof status === 'number' ? status : 200 })
  ),
  apiUnauthorized: vi.fn(() =>
    Response.json(
      { success: false, error: { code: 'AUTH_REQUIRED', message: 'Authentication required' } },
      { status: 401 }
    )
  ),
  apiForbidden: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'FORBIDDEN', message: message || 'Forbidden' } },
      { status: 403 }
    )
  ),
  apiNotFound: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'NOT_FOUND', message: message || 'Not found' } },
      { status: 404 }
    )
  ),
  apiConflict: vi.fn((message?: string) =>
    Response.json(
      { success: false, error: { code: 'CONFLICT', message: message || 'Resource conflict' } },
      { status: 409 }
    )
  ),
  apiGone: vi.fn((message?: string) =>
    Response.json(
      {
        success: false,
        error: { code: 'GONE', message: message || 'Resource no longer available' },
      },
      { status: 410 }
    )
  ),
  apiValidationError: vi.fn((details?: unknown) =>
    Response.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details },
      },
      { status: 422 }
    )
  ),
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
}));

// ── Mock @entities/tenant/server → withTenant ─────────────────
vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.withTenantResult)),
}));

// ── Mock @entities/agent ─────────────────────────────────────
vi.mock('@entities/agent', () => ({
  SCOPE_BUNDLES: mocks.scopeBundles,
  validateScopes: vi.fn((requested: string[]) => {
    return mocks.unknownScopes;
  }),
}));

// ── Mock @api/shared (logDelegationAction) ────────────────────
vi.mock('@api/shared/delegations', () => ({
  logDelegationAction: vi.fn(() => Promise.resolve()),
}));

// ── Mock @shared/lib/agent-token ─────────────────────────────
vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    signAgentToken: vi.fn(() => Promise.resolve('mock-agent-token-xxxxx')),
    hashToken: vi.fn(() => 'mock-hash-abcd1234'),
  };
});

import { POST } from '@/app/api/properties/[id]/delegate/route';
import { makeSelectChain, makeInsertChain, createMockRequest } from '@/test/api/helpers';
import type { DelegatedProviderAgent } from '@/entities/agent/types';

function makeReq({
  method = 'POST',
  body,
  propertyId = 'prop-1',
}: {
  method?: string;
  body?: unknown;
  propertyId?: string;
} = {}): Request {
  return createMockRequest({
    method,
    url: `http://localhost:3000/api/properties/${propertyId}/delegate`,
    body,
  });
}

function makeSession({
  userId = 'owner-user-1',
  role = 'RESIDENT',
  email = 'owner@test.com',
  name = 'Owner',
}: Partial<{
  userId: string;
  role: string;
  email: string;
  name: string;
}> = {}) {
  return {
    session: { user: { id: userId, email, name } },
    userId,
    role,
    suspension: null,
  };
}

describe('POST /api/properties/[id]/delegate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.propertyOwnerId = 'owner-user-1';
    mocks.providerExists = true;
    mocks.existingDelegation = [];
    mocks.unknownScopes = [];
    mocks.withTenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── TEST 1: Owner delegates to provider → 201 ──────────────
  it('should return 201 when owner creates a PENDING delegation', async () => {
    mocks.sessionResult = makeSession();

    // Use a counter to return different data on each select call
    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      // Call 1: property lookup → return property
      if (callCount === 1) {
        return makeSelectChain([
          {
            id: 'prop-1',
            tenantId: 'test-tenant-id',
            ownerId: 'owner-user-1',
          },
        ]);
      }
      // Call 2: provider lookup → return user
      if (callCount === 2) {
        return makeSelectChain([{ id: 'provider-1' }]);
      }
      // Call 3: existing delegation check → return empty (no conflict)
      return makeSelectChain([]);
    });

    mocks.dbMock.insert.mockImplementation(() =>
      makeInsertChain([
        {
          id: 'del-1',
          tenantId: 'test-tenant-id',
          agentId: 'provider-1',
          propertyId: 'prop-1',
          grantedById: 'owner-user-1',
          permissions: ['maintenance:read', 'maintenance:coordinate'],
          originalPermissions: ['maintenance:read', 'maintenance:coordinate'],
          status: 'PENDING',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86400000),
          createdAt: new Date(),
        },
      ])
    );

    const request = makeReq({
      body: { providerId: 'provider-1', scopes: ['maintenance:read', 'maintenance:coordinate'] },
    });
    const response = await POST(request, { params: { id: 'prop-1' } });

    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('PENDING');
  });

  // ── TEST 2: Multiple scopes → valid permissions array ─────
  it('should return 201 with full permissions array when owner delegates 5 scopes', async () => {
    mocks.sessionResult = makeSession();

    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectChain([
          { id: 'prop-1', tenantId: 'test-tenant-id', ownerId: 'owner-user-1' },
        ]);
      }
      if (callCount === 2) {
        return makeSelectChain([{ id: 'provider-1' }]);
      }
      return makeSelectChain([]);
    });

    mocks.dbMock.insert.mockImplementation(() =>
      makeInsertChain([
        {
          id: 'del-2',
          tenantId: 'test-tenant-id',
          agentId: 'provider-1',
          propertyId: 'prop-1',
          grantedById: 'owner-user-1',
          permissions: [
            'maintenance:read',
            'inspection:view',
            'documents:read',
            'financials:read',
            'listing:read',
          ],
          originalPermissions: [
            'maintenance:read',
            'inspection:view',
            'documents:read',
            'financials:read',
            'listing:read',
          ],
          status: 'PENDING',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86400000),
          createdAt: new Date(),
        },
      ])
    );

    const request = makeReq({
      body: {
        providerId: 'provider-1',
        scopes: [
          'maintenance:read',
          'inspection:view',
          'documents:read',
          'financials:read',
          'listing:read',
        ],
      },
    });
    const response = await POST(request, { params: { id: 'prop-1' } });
    expect(response.status).toBe(201);
  });

  // ── TEST 3: Non-owner cannot delegate → 403 ───────────────
  it('should return 403 when a non-owner tries to delegate', async () => {
    mocks.sessionResult = makeSession({ userId: 'other-user', role: 'RESIDENT' });

    const propChain = makeSelectChain([
      {
        id: 'prop-1',
        tenantId: 'test-tenant-id',
        ownerId: 'owner-user-1',
        street: '123 Main',
        unit: 'A',
      },
    ]);
    mocks.dbMock.select.mockImplementation(() => propChain);

    const request = makeReq({
      body: { providerId: 'provider-1', scopes: ['maintenance:read'] },
    });
    const response = await POST(request, { params: { id: 'prop-1' } });
    expect(response.status).toBe(403);
  });

  // ── TEST 4: Duplicate delegation → 409 ────────────────────
  it('should return 409 when active delegation already exists', async () => {
    mocks.sessionResult = makeSession();

    // First select: property lookup
    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      if (callCount <= 2) {
        // Property exists
        return makeSelectChain([
          { id: 'prop-1', tenantId: 'test-tenant-id', ownerId: 'owner-user-1' },
        ]);
      }
      // Provider exists
      return makeSelectChain([{ id: 'provider-1' }]);
    });

    // Existing delegation check — return an existing delegation
    // We need to intercept the agentAccess lookup
    // Actually for simplicity, let's test the right guard: provide an existing delegation
    // The findFirst call for agentAccess will use select chain

    const request = makeReq({
      body: { providerId: 'provider-1', scopes: ['maintenance:read'] },
    });

    // Since we're testing a specific flow, let's use a simpler approach:
    // The route handler queries agentAccesses with tenantId, propertyId, agentId, status IN ('PENDING','ACTIVE')
    // We need the third select call to return an existing delegation

    // Reset counter approach
    mocks.dbMock.select.mockReset();
    let selectCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      selectCount++;
      // 1st call: property lookup
      if (selectCount === 1) {
        return makeSelectChain([
          { id: 'prop-1', tenantId: 'test-tenant-id', ownerId: 'owner-user-1' },
        ]);
      }
      // 2nd call: provider lookup (users table)
      if (selectCount === 2) {
        return makeSelectChain([{ id: 'provider-1' }]);
      }
      // 3rd call: existing delegation check (agentAccess)
      return makeSelectChain([
        { id: 'existing-del-1', status: 'ACTIVE', agentId: 'provider-1', propertyId: 'prop-1' },
      ]);
    });

    const response = await POST(request, { params: { id: 'prop-1' } });
    expect(response.status).toBe(409);
  });

  // ── TEST 5: Invalid scopes → 400 ──────────────────────────
  it('should return 400 when invalid scopes are provided', async () => {
    mocks.sessionResult = makeSession();
    mocks.unknownScopes = ['VIEW_LISTING', 'MANAGE_OCCUPANCY']; // old enum values

    const propChain = makeSelectChain([
      {
        id: 'prop-1',
        tenantId: 'test-tenant-id',
        ownerId: 'owner-user-1',
      },
    ]);
    mocks.dbMock.select.mockImplementation(() => propChain);

    const request = makeReq({
      body: { providerId: 'provider-1', scopes: ['VIEW_LISTING', 'MANAGE_OCCUPANCY'] },
    });
    const response = await POST(request, { params: { id: 'prop-1' } });
    expect(response.status).toBe(400);
  });

  // ── TEST 6: DelegationAction logged ───────────────────────
  it('should log a DelegationAction on successful delegation creation', async () => {
    mocks.sessionResult = makeSession();

    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return makeSelectChain([
          { id: 'prop-1', tenantId: 'test-tenant-id', ownerId: 'owner-user-1' },
        ]);
      }
      if (callCount === 2) {
        return makeSelectChain([{ id: 'provider-1' }]);
      }
      return makeSelectChain([]);
    });

    mocks.dbMock.insert.mockImplementation(() =>
      makeInsertChain([
        {
          id: 'del-3',
          tenantId: 'test-tenant-id',
          agentId: 'provider-1',
          propertyId: 'prop-1',
          grantedById: 'owner-user-1',
          permissions: ['maintenance:read'],
          originalPermissions: ['maintenance:read'],
          status: 'PENDING',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 90 * 86400000),
          createdAt: new Date(),
        },
      ])
    );

    const { logDelegationAction } = await import('@api/shared/delegations');
    const request = makeReq({
      body: { providerId: 'provider-1', scopes: ['maintenance:read'] },
    });
    const response = await POST(request, { params: { id: 'prop-1' } });

    expect(response.status).toBe(201);
    expect(logDelegationAction).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'test-tenant-id',
        action: 'created',
      })
    );
  });
});
