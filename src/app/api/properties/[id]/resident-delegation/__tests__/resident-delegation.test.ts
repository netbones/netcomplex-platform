/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

const mocks = vi.hoisted(() => ({
  sessionResult: { user: { id: 'owner-1', role: 'RESIDENT' } } as any,
  tenantResult: { tenantId: 'test-tenant-id' as string, tenantSlug: 'test-tenant' as string },
  propertyResult: { id: 'prop-1', ownerId: 'owner-1', tenantId: 'test-tenant-id' } as any,
  profileResult: {
    id: 'profile-1',
    displayName: 'Renter',
    household: { propertyId: 'prop-1', status: 'ACTIVE' },
  } as any,
  delegationResult: {
    id: 'del-1',
    profileId: 'profile-1',
    scopes: ['maintenance:create'],
    grantedAt: new Date(),
    expiresAt: null as Date | null,
  },
}));

vi.mock('@api/server', () => ({
  db: {
    property: { findFirst: vi.fn(() => Promise.resolve(mocks.propertyResult)) },
    residentDelegation: {
      findFirst: vi.fn(),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(() => Promise.resolve(mocks.delegationResult)),
      update: vi.fn(() => Promise.resolve({})),
      updateMany: vi.fn(() => Promise.resolve({ count: 1 })),
    },
    profile: { findFirst: vi.fn(() => Promise.resolve(mocks.profileResult)) },
  },
  auth: {
    api: {
      getSession: () => Promise.resolve(mocks.sessionResult),
    },
  },
  apiSuccess: vi.fn(
    (data: unknown, status = 200) =>
      new Response(JSON.stringify({ success: true, data }), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, status: number, message: unknown) =>
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

function createRequest(method: string, body?: unknown, role = 'RESIDENT'): Request {
  mocks.sessionResult = { user: { id: 'owner-1', role } } as any;
  const url = 'http://localhost/api/properties/prop-1/resident-delegation';
  return new Request(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe('POST /api/properties/[id]/resident-delegation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('owner grants renter maintenance:create → 201 ResidentDelegation record', async () => {
    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['maintenance:create'] });
    const res = await POST(req, { params: { id: 'prop-1' } });
    expect(res.status).toBe(201);
  });

  it('non-owner attempts to grant → 403 FORBIDDEN', async () => {
    mocks.propertyResult = {
      id: 'prop-1',
      ownerId: 'other-owner',
      tenantId: 'test-tenant-id',
    } as any;
    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['maintenance:create'] });
    const res = await POST(req, { params: { id: 'prop-1' } });
    expect(res.status).toBe(403);
    mocks.propertyResult = { id: 'prop-1', ownerId: 'owner-1', tenantId: 'test-tenant-id' } as any;
  });

  it('grant with non-delegatable scope → 400 VALIDATION_ERROR', async () => {
    const req = createRequest('POST', { profileId: 'profile-1', scopes: ['financials:read'] });
    const res = await POST(req, { params: { id: 'prop-1' } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toContain('VALIDATION');
  });

  it('GET returns active delegations for a property', async () => {
    const { db } = await import('@api/server');
    (db.residentDelegation.findMany as any).mockResolvedValue([
      {
        id: 'del-1',
        profileId: 'profile-1',
        scopes: ['maintenance:create'],
        grantedAt: new Date(),
        expiresAt: null,
        profile: { id: 'profile-1', displayName: 'Renter', profileAddress: '123 Main St' },
      },
    ]);
    const req = createRequest('GET');
    const res = await GET(req, { params: { id: 'prop-1' } });
    expect(res.status).toBe(200);
  });

  it('DELETE revokes an existing delegation', async () => {
    const { db } = await import('@api/server');
    (db.residentDelegation.findFirst as any).mockResolvedValue({
      id: 'del-1',
      propertyId: 'prop-1',
      tenantId: 'test-tenant-id',
      revokedAt: null,
      property: { ownerId: 'owner-1' },
    });
    const req = createRequest('DELETE', { delegationId: 'del-1' });
    const res = await DELETE(req, { params: { id: 'prop-1' } });
    expect(res.status).toBe(200);
  });

  it('DELETE by non-owner → 403 FORBIDDEN', async () => {
    const { db } = await import('@api/server');
    (db.residentDelegation.findFirst as any).mockResolvedValue({
      id: 'del-1',
      propertyId: 'prop-2',
      tenantId: 'test-tenant-id',
      revokedAt: null,
      property: { ownerId: 'other-owner' },
    });
    const req = createRequest('DELETE', { delegationId: 'del-1' });
    const res = await DELETE(req, { params: { id: 'prop-2' } });
    expect(res.status).toBe(403);
  });
});
