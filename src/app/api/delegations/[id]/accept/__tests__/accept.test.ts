/**
 * Task 3 — POST /api/delegations/[id]/accept tests
 *
 * RED phase: failing tests for provider delegation acceptance.
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
  delegationData: null as unknown as Record<string, unknown> | null,
  agentProfile: null as unknown as Record<string, unknown> | null,
  signedToken: 'mock-signed-token-jwt-xxxxx',
  tokenHash: 'mock-token-hash-abcd1234',
}));

// ── Mock @api/server ──────────────────────────────────────────
vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  users: { id: 'id' },
  agentAccesses: {
    id: 'id',
    tenantId: 'tenantId',
    agentId: 'agentId',
    propertyId: 'propertyId',
    grantedById: 'grantedById',
    status: 'status',
    permissions: 'permissions',
    expiresAt: 'expiresAt',
  },
  agentTokens: {
    id: 'id',
    tenantId: 'tenantId',
    agentId: 'agentId',
    issuedById: 'issuedById',
    accessId: 'accessId',
    name: 'name',
    tokenHash: 'tokenHash',
    scope: 'scope',
    expiresAt: 'expiresAt',
    credentialType: 'credentialType',
  },
  agentProfiles: { agentId: 'agentId', isVerified: 'isVerified' },
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
  apiError: vi.fn((code: string, message: string, status: number) =>
    Response.json({ success: false, error: { code, message } }, { status })
  ),
}));

// ── Mock @entities/tenant/server ──────────────────────────────
vi.mock('@entities/tenant/server', () => ({
  withTenant: vi.fn(() => Promise.resolve(mocks.withTenantResult)),
}));

// ── Mock @api/shared ──────────────────────────────────────────
vi.mock('@api/shared', async importOriginal => {
  const actual = await importOriginal<typeof import('@api/shared')>();
  return {
    ...actual,
    logDelegationAction: vi.fn(() => Promise.resolve()),
  };
});

// ── Mock @shared/lib ──────────────────────────────────────────
vi.mock('@shared/lib', async importOriginal => {
  const actual = await importOriginal<typeof import('@shared/lib')>();
  return {
    ...actual,
    signAgentToken: vi.fn(() => Promise.resolve(mocks.signedToken)),
    hashToken: vi.fn(() => mocks.tokenHash),
  };
});

import { POST } from '@/app/api/delegations/[id]/accept/route';
import {
  makeSelectChain,
  makeInsertChain,
  makeUpdateChain,
  createMockRequest,
} from '@/test/api/helpers';

function makeReq({
  delegationId = 'del-1',
}: {
  delegationId?: string;
} = {}): Request {
  return createMockRequest({
    method: 'POST',
    url: `http://localhost:3000/api/delegations/${delegationId}/accept`,
  });
}

function makeSession({
  userId = 'provider-1',
  role = 'RESIDENT',
}: Partial<{ userId: string; role: string }> = {}) {
  return {
    session: { user: { id: userId, email: 'provider@test.com', name: 'Provider' } },
    userId,
    role,
    suspension: null,
  };
}

describe('POST /api/delegations/[id]/accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.delegationData = null;
    mocks.agentProfile = null;
    mocks.signedToken = 'mock-signed-token-jwt-xxxxx';
    mocks.tokenHash = 'mock-token-hash-abcd1234';
    mocks.withTenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupDelegation(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: 'del-1',
      tenantId: 'test-tenant-id',
      agentId: 'provider-1',
      propertyId: 'prop-1',
      grantedById: 'owner-user-1',
      permissions: ['maintenance:read', 'maintenance:coordinate'],
      status: 'PENDING',
      expiresAt: new Date(Date.now() + 90 * 86400000),
      ...overrides,
    };
  }

  function setupProfile(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      agentId: 'provider-1',
      isVerified: true,
      ...overrides,
    };
  }

  // ── TEST 1: Provider accepts PENDING delegation → 200 ────────
  it('should return 200 with ACTIVE status and token when provider accepts', async () => {
    mocks.sessionResult = makeSession();

    // Delegation lookup returns PENDING delegation
    const delegationChain = makeSelectChain([setupDelegation()]);
    // AgentProfile lookup returns verified profile
    const profileChain = makeSelectChain([setupProfile()]);

    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return delegationChain;
      return profileChain;
    });

    mocks.dbMock.update.mockImplementation(() => makeUpdateChain([]));
    mocks.dbMock.insert.mockImplementation(() => makeInsertChain([]));

    const response = await POST(makeReq(), { params: { id: 'del-1' } });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe('ACTIVE');
    expect(json.data.token).toBe('mock-signed-token-jwt-xxxxx');
  });

  // ── TEST 2: Non-target provider → 403 ────────────────────────
  it('should return 403 when non-target provider tries to accept', async () => {
    mocks.sessionResult = makeSession({ userId: 'other-provider-999' });

    const delegationChain = makeSelectChain([setupDelegation({ agentId: 'provider-1' })]);
    mocks.dbMock.select.mockImplementation(() => delegationChain);

    const response = await POST(makeReq(), { params: { id: 'del-1' } });
    expect(response.status).toBe(403);
  });

  // ── TEST 3: Unverified provider → 403 ────────────────────────
  it('should return 403 when provider is not verified', async () => {
    mocks.sessionResult = makeSession();

    const delegationChain = makeSelectChain([setupDelegation()]);
    const profileChain = makeSelectChain([setupProfile({ isVerified: false })]);

    let callCount = 0;
    mocks.dbMock.select.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return delegationChain;
      return profileChain;
    });

    const response = await POST(makeReq(), { params: { id: 'del-1' } });
    expect(response.status).toBe(403);
  });

  // ── TEST 4: Already-accepted → 409 ───────────────────────────
  it('should return 409 when delegation is already accepted', async () => {
    mocks.sessionResult = makeSession();

    const delegationChain = makeSelectChain([setupDelegation({ status: 'ACTIVE' })]);
    mocks.dbMock.select.mockImplementation(() => delegationChain);

    const response = await POST(makeReq(), { params: { id: 'del-1' } });
    expect(response.status).toBe(409);
  });

  // ── TEST 5: Expired delegation → 410 ─────────────────────────
  it('should return 410 when delegation has expired', async () => {
    mocks.sessionResult = makeSession();

    const delegationChain = makeSelectChain([
      setupDelegation({ expiresAt: new Date('2020-01-01') }),
    ]);
    mocks.dbMock.select.mockImplementation(() => delegationChain);
    mocks.dbMock.update.mockImplementation(() => makeUpdateChain([]));

    const response = await POST(makeReq(), { params: { id: 'del-1' } });
    expect(response.status).toBe(410);
  });
});
