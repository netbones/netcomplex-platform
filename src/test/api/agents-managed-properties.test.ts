/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from './helpers';

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
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@api/server', async () => {
  const { NextResponse } = await import('next/server');
  return {
    auth: mocks.auth,
    db: mocks.db,
    agentAccesses: {
      id: 'id',
      agentId: 'agentId',
      propertyId: 'propertyId',
      grantedById: 'grantedById',
      tenantId: 'tenantId',
      accessLevel: 'accessLevel',
      expiresAt: 'expiresAt',
      createdAt: 'createdAt',
    },
    users: {
      id: 'id',
      name: 'name',
    },
    properties: {
      id: 'id',
      street: 'street',
      unit: 'unit',
      platformAddress: 'platformAddress',
      homeImage: 'homeImage',
    },
    apiError: (message: string, status?: number) =>
      NextResponse.json({ success: false, error: { message } }, { status: status ?? 400 }) as any,
    apiSuccess: (data: unknown) =>
      NextResponse.json({ success: true, data }, { status: 200 }) as any,
    apiUnauthorized: (message = 'Authentication required') =>
      NextResponse.json({ success: false, error: { code: 'AUTH_REQUIRED', message } }, { status: 401 }) as any,
    apiInternalError: (message = 'Internal server error') =>
      NextResponse.json({ success: false, error: { code: 'INTERNAL_ERROR', message } }, { status: 500 }) as any,
  };
});

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

vi.mock('@shared/lib', () => ({
  apiLogger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { GET } from '@/app/api/agents/managed-properties/route';

const mockDate = new Date('2026-06-01T00:00:00.000Z');

function buildManagedPropertyRow(overrides: Record<string, any> = {}) {
  return {
    agentAccess: {
      id: 'access-1',
      tenantId: 'test-tenant-id',
      agentId: 'user-1',
      propertyId: 'prop-1',
      grantedById: 'grantor-1',
      accessLevel: 'MANAGEMENT',
      permissions: ['VIEW', 'SCHEDULE'],
      startedAt: mockDate,
      expiresAt: mockDate,
      isActive: true,
      commissionRate: null,
      contractTerms: null,
      organizationId: null,
      createdAt: mockDate,
      updatedAt: mockDate,
      deletedAt: null,
      ...overrides.agentAccess,
    },
    property: {
      id: 'prop-1',
      street: '123 Main St',
      unit: '101',
      platformAddress: '123 Main St, Unit 101',
      homeImage: null,
      ...overrides.property,
    },
    grantedBy: {
      id: 'grantor-1',
      name: 'Admin User',
      ...overrides.grantedBy,
    },
  };
}

describe('GET /api/agents/managed-properties', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.api.getSession.mockReset();
    mocks.db.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 when no session exists', async () => {
    mocks.auth.api.getSession.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);

    expect(res.status).toBe(401);
    const body = await res.json();
    expect((body as any).error?.code).toBe('AUTH_REQUIRED');
  });

  it('returns 401 when session has no user id', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: null } } as any);

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);

    expect(res.status).toBe(401);
  });

  it('returns managed properties list', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    const row = buildManagedPropertyRow();
    mocks.db.select.mockReturnValue(makeSelectChain([row]));

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.properties).toHaveLength(1);
    expect((body as any).data.properties[0].id).toBe('prop-1');
    expect((body as any).data.properties[0].street).toBe('123 Main St');
    expect((body as any).data.properties[0].unit).toBe('101');
    expect((body as any).data.properties[0].accessLevel).toBe('MANAGEMENT');
    expect((body as any).data.properties[0].grantedBy.name).toBe('Admin User');
  });

  it('returns empty properties when db returns no rows', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mocks.db.select.mockReturnValue(makeSelectChain([]));

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.properties).toEqual([]);
  });

  it('uses fallback empty string for missing property values', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    const row = buildManagedPropertyRow();
    row.property = null as any;
    mocks.db.select.mockReturnValue(makeSelectChain([row]));

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.properties[0].street).toBe('');
    expect((body as any).data.properties[0].id).toBe('');
  });

  it('uses "Unknown" for missing grantor name', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    const row = buildManagedPropertyRow();
    row.grantedBy = null as any;
    mocks.db.select.mockReturnValue(makeSelectChain([row]));

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect((body as any).data.properties[0].grantedBy.name).toBe('Unknown');
  });

  it('serializes dates to ISO strings', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    const row = buildManagedPropertyRow();
    mocks.db.select.mockReturnValue(makeSelectChain([row]));

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);
    const body = await res.json();

    expect((body as any).data.properties[0].accessExpiresAt).toBe(mockDate.toISOString());
    expect((body as any).data.properties[0].grantedAt).toBe(mockDate.toISOString());
  });

  it('returns 500 when db throws', async () => {
    mocks.auth.api.getSession.mockResolvedValue({ user: { id: 'user-1' } } as any);
    mocks.db.select.mockImplementation(() => {
      throw new Error('DB failure');
    });

    const res = await GET(new Request('http://localhost/api/agents/managed-properties') as any);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect((body as any).error?.code).toBe('INTERNAL_ERROR');
  });
});
