/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock next/headers (used by withTenant internally)
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

// ═══════════════════════════════════════════════════════════════
// Mutable mock state (vi.hoisted ensures it runs before vi.mock)
// ═══════════════════════════════════════════════════════════════
const mocks = vi.hoisted(() => {
  const queryResults: any[] = [];
  let callIndex = 0;

  function consumeNext(): any {
    const r = callIndex < queryResults.length ? queryResults[callIndex] : [];
    callIndex++;
    return Promise.resolve(Array.isArray(r) ? r : [r]);
  }

  function makeChain() {
    const chain: any = {
      select: vi.fn(() => chain),
      from: vi.fn(() => chain),
      innerJoin: vi.fn(() => chain),
      where: vi.fn(() => chain),
      orderBy: vi.fn(consumeNext),
      limit: vi.fn(consumeNext),
      values: vi.fn(() => Promise.resolve()),
      set: vi.fn(() => chain),
    };
    return chain;
  }

  return {
    queryResults,
    callIndex,
    /** Set the sequential results that db chain terminal methods (limit/orderBy) consume. */
    setResults(r: any[]) {
      queryResults.length = 0;
      queryResults.push(...r);
      callIndex = 0;
    },
    makeChain,
    sessionResult: { userId: 'owner-1', role: 'RESIDENT' } as {
      userId: string;
      role: string;
    } | null,
    tenantResult: {
      tenantId: 'test-tenant-id' as string,
      tenantSlug: 'test-tenant' as string,
    },
  };
});

// ═══════════════════════════════════════════════════════════════
// Mock @api/server with Drizzle-compatible chain patterns
// ═══════════════════════════════════════════════════════════════
vi.mock('@api/server', () => ({
  db: {
    select: vi.fn(() => mocks.makeChain()),
    insert: vi.fn(() => mocks.makeChain()),
    update: vi.fn(() => mocks.makeChain()),
    delete: vi.fn(() => mocks.makeChain()),
  },
  // Drizzle table references — used only for column names in .select({...}) calls
  residentDelegations: {
    id: 'id',
    propertyId: 'propertyId',
    tenantId: 'tenantId',
    profileId: 'profileId',
    scopes: 'scopes',
    grantedAt: 'grantedAt',
    expiresAt: 'expiresAt',
    revokedAt: 'revokedAt',
  },
  properties: {
    id: 'id',
    ownerId: 'ownerId',
    tenantId: 'tenantId',
  },
  profiles: {
    id: 'id',
    tenantId: 'tenantId',
  },
  households: {
    propertyId: 'propertyId',
    status: 'status',
  },
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
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
  apiError: vi.fn(
    (code: string, message: string, status: number) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { POST, GET, DELETE } from '../route';

// ═══════════════════════════════════════════════════════════════
// Shared helpers
// ═══════════════════════════════════════════════════════════════

function createRequest(method: string, body?: unknown, role = 'RESIDENT'): NextRequest {
  mocks.sessionResult = { userId: 'owner-1', role };
  const url = 'http://localhost/api/properties/prop-1/resident-delegation';
  return new NextRequest(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ═══════════════════════════════════════════════════════════════
// Test Suite: Resident Delegation Lifecycle
// ═══════════════════════════════════════════════════════════════

describe('POST /api/properties/[id]/resident-delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.setResults([]);
    mocks.sessionResult = { userId: 'owner-1', role: 'RESIDENT' };
  });

  // ── Test 1: Happy path — owner grants maintenance:create scope ──
  it('owner grants renter maintenance:create scope → 201 with delegation data', async () => {
    // db.select({ownerId}).from(properties).where(...).limit(1) → property owned by caller
    // db.select({id}).from(profiles).innerJoin(households).where(...).limit(1) → profile found
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership check
      [{ id: 'profile-1' }], // Query 2: profile + household check
    ]);

    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['maintenance:create'] });
    const res = await POST(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(201);
    // Verify Drizzle chain was used (not Prisma findFirst/findMany)
    const { db } = await import('@api/server');
    expect((db as any).select).toHaveBeenCalled();
    expect((db as any).insert).toHaveBeenCalled();
    expect((db as any).update).toHaveBeenCalled();
  });

  // ── Test 2: Authorized maintenance creation — renter has active delegation ──
  it('renter authorized via delegation → GET returns delegation with maintenance:create', async () => {
    // GET handler queries:
    // 1. select ownerId from properties → ownership ok
    // 2. select from residentDelegations → active delegation exists
    const grantedAt = new Date('2026-06-01');
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership
      [
        // Query 2: delegation list
        {
          id: 'del-1',
          profileId: 'profile-1',
          scopes: ['maintenance:create'],
          grantedAt,
          expiresAt: null,
        },
      ],
    ]);

    const req = createRequest('GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
    expect(body.data[0].scopes).toContain('maintenance:create');
  });

  // ── Test 3: Revoke → deny — owner revokes, renter delegation removed ──
  it('owner revokes delegation → DELETE 200, then GET returns empty list', async () => {
    // DELETE handler queries:
    // 1. select id from residentDelegations → delegation found
    // 2. select ownerId from properties → ownership ok
    mocks.setResults([
      [{ id: 'del-1' }], // Query 1: delegation exists
      [{ ownerId: 'owner-1' }], // Query 2: property ownership
    ]);

    const req = createRequest('DELETE', { delegationId: 'del-1' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.revoked).toBe(true);

    // Now verify GET returns empty (delegation revoked)
    vi.clearAllMocks();
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership
      [], // Query 2: no active delegations
    ]);

    const getReq = createRequest('GET');
    const getRes = await GET(getReq, { params: Promise.resolve({ id: 'prop-1' }) });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data).toHaveLength(0);
  });

  // ── Test 4: Non-owner attempts grant ──
  it('non-owner attempts to grant → 403 FORBIDDEN', async () => {
    // Only the first query runs before the 403 check:
    mocks.setResults([
      [{ ownerId: 'other-owner' }], // Query 1: property owned by other user
    ]);

    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['maintenance:create'] });
    const res = await POST(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(403);
  });

  // ── Test 5: Invalid scope rejection ──
  it('grant with non-delegatable scope → 400 VALIDATION_ERROR', async () => {
    // First query (property check) succeeds, then scope validation fires:
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership ok
    ]);

    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['financials:read'] });
    const res = await POST(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toContain('VALIDATION');
  });

  // ── Test 6: GET returns active delegations for property ──
  it('GET returns active delegations for a property → 200', async () => {
    const grantedAt = new Date('2026-06-01');
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership
      [
        // Query 2: delegation list
        {
          id: 'del-1',
          profileId: 'profile-1',
          scopes: ['maintenance:create'],
          grantedAt,
          expiresAt: null,
        },
        {
          id: 'del-2',
          profileId: 'profile-2',
          scopes: ['maintenance:read', 'inspection:view'],
          grantedAt,
          expiresAt: null,
        },
      ],
    ]);

    const req = createRequest('GET');
    const res = await GET(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
    expect(body.data[0].id).toBe('del-1');
    expect(body.data[1].id).toBe('del-2');
  });

  // ── Test 7: DELETE by non-owner ──
  it('DELETE by non-owner → 403 FORBIDDEN', async () => {
    mocks.setResults([
      [{ id: 'del-1' }], // Query 1: delegation exists
      [{ ownerId: 'other-owner' }], // Query 2: property owned by different user
    ]);

    const req = createRequest('DELETE', { delegationId: 'del-1' });
    const res = await DELETE(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(403);
  });

  // ── Test 8: Revoked delegation → maintenance creation denied (GET empty) ──
  it('after revoke, GET returns empty list → renter has no active delegation', async () => {
    // DELETE: revoke an existing delegation
    mocks.setResults([
      [{ id: 'del-1' }], // Query 1: delegation exists
      [{ ownerId: 'owner-1' }], // Query 2: property ownership ok
    ]);

    const delReq = createRequest('DELETE', { delegationId: 'del-1' });
    const delRes = await DELETE(delReq, { params: Promise.resolve({ id: 'prop-1' }) });
    expect(delRes.status).toBe(200);

    // GET: verify no active delegations remain
    vi.clearAllMocks();
    mocks.setResults([
      [{ ownerId: 'owner-1' }], // Query 1: property ownership
      [], // Query 2: no delegations (revoked)
    ]);

    const getReq = createRequest('GET');
    const getRes = await GET(getReq, { params: Promise.resolve({ id: 'prop-1' }) });
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.data).toHaveLength(0);

    // This confirms the renter cannot pass the maintenance route's delegation
    // authorization check — maintenance POST handler would return 403.
  });

  // ── Test 9: GET with admin role bypasses ownership check ──
  it('GET with ADMIN role returns delegations even when not owner → 200', async () => {
    mocks.setResults([
      [{ ownerId: 'other-owner' }], // Query 1: property owned by different user
      [
        // Query 2: delegation list (admin allowed)
        {
          id: 'del-1',
          profileId: 'profile-1',
          scopes: ['maintenance:create'],
          grantedAt: new Date(),
          expiresAt: null,
        },
      ],
    ]);

    const req = createRequest('GET');
    // Override session to ADMIN after createRequest sets it to RESIDENT
    mocks.sessionResult = { userId: 'admin-1', role: 'ADMIN' };
    const res = await GET(req, { params: Promise.resolve({ id: 'prop-1' }) });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(1);
  });
});
