import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { makeSelectChain } from '@/test/api/helpers';

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
  sessionResult: null as { userId: string; user: { id: string } } | null,
  dbMock: { select: vi.fn() },
  streams: [
    {
      id: 's-1',
      key: 'data-share',
      label: 'Data Share',
      description: 'Share anonymous data',
      residentSharePct: 50,
      isActive: true,
    },
    {
      id: 's-2',
      key: 'usage-stats',
      label: 'Usage Stats',
      description: 'Share usage stats',
      residentSharePct: 30,
      isActive: true,
    },
  ],
}));

const jsonResponse = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  auth: { api: { getSession: vi.fn(() => Promise.resolve(mocks.sessionResult)) } },
  dataRevenueStreams: {
    id: 'id',
    tenantId: 'tenantId',
    key: 'key',
    label: 'label',
    description: 'description',
    isActive: 'isActive',
    residentSharePct: 'residentSharePct',
  },
  apiSuccess: vi.fn((data: unknown) => jsonResponse({ success: true, data }, 200)),
  apiUnauthorized: vi.fn(() => jsonResponse({ error: 'Unauthorized' }, 401)),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  getSessionAndRole: vi.fn(() => Promise.resolve(mocks.sessionResult)),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve({ tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' }),
}));

import { GET } from '@/app/api/v1/tenant/dwallet/streams/route';

describe('GET /api/v1/tenant/dwallet/streams', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sessionResult = null;
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 without auth', async () => {
    const response = await GET(new Request('http://localhost:3000/api/v1/tenant/dwallet/streams'));
    expect(response.status).toBe(401);
  });

  it('returns active streams when authenticated', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain(mocks.streams));

    const response = await GET(new Request('http://localhost:3000/api/v1/tenant/dwallet/streams'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].key).toBe('data-share');
    expect(body.data[0].residentSharePct).toBe(50);
    expect(body.data[1].key).toBe('usage-stats');
  });

  it('returns empty list when no streams configured', async () => {
    mocks.sessionResult = { userId: 'user-1', user: { id: 'user-1' } };
    mocks.dbMock.select.mockReturnValue(makeSelectChain([]));

    const response = await GET(new Request('http://localhost:3000/api/v1/tenant/dwallet/streams'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual([]);
  });
});
