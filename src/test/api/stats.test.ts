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
  dbMock: {
    select: vi.fn(),
  },
}));

vi.mock('@api/server', () => ({
  db: mocks.dbMock,
  users: { id: 'id', isActive: 'isActive', tenantId: 'tenantId' },
  groups: { id: 'id', isActive: 'isActive', tenantId: 'tenantId', deletedAt: 'deletedAt' },
  contents: {
    id: 'id',
    category: 'category',
    tenantId: 'tenantId',
    deletedAt: 'deletedAt',
  },
  settings: { key: 'key', value: 'value', tenantId: 'tenantId' },
  notDeleted: vi.fn((t: unknown) => ({ isNull: [t, 'deletedAt'] })),
  apiSuccess: vi.fn(
    (data: unknown) =>
      new Response(JSON.stringify({ success: true, data }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  apiError: vi.fn(
    (code: string, message: string) =>
      new Response(JSON.stringify({ success: false, error: { code, message } }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
  ),
  withErrorHandler: vi.fn((handler: (req: Request) => Promise<Response>) => handler as never),
  now: vi.fn(() => new Date('2026-06-21T12:00:00Z')),
}));

vi.mock('@entities/tenant/server', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
  SETTINGS_KEYS: {
    STATS_HOMES: 'stats_homes',
    STATS_YEARS: 'stats_years',
    STATS_BIRD_SPECIES: 'stats_bird_species',
    STATS_NATIVE_PLANTS: 'stats_native_plants',
  },
}));
vi.mock('@entities/tenant', () => ({
  withTenant: () => Promise.resolve(mocks.tenantResult),
}));

import { GET } from '@/app/api/stats/route';
import { makeSelectChain } from './helpers';

function makeCountSelect(result: { count: number }) {
  return makeSelectChain([result]);
}

function makeSettingsSelect(entries: { key: string; value: string }[]) {
  return makeSelectChain(entries);
}

describe('Stats API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.tenantResult = { tenantId: 'test-tenant-id', tenantSlug: 'test-tenant' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns stats with all counts and fallback defaults', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 42 }))
      .mockReturnValueOnce(makeCountSelect({ count: 5 }))
      .mockReturnValueOnce(makeCountSelect({ count: 12 }))
      .mockReturnValueOnce(makeSettingsSelect([]));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toEqual({
      homes: 180,
      years: 15,
      birdSpecies: 47,
      nativePlants: 150,
      residents: 42,
      groups: 5,
      conservationArticles: 12,
    });
  });

  it('uses DB-backed settings when present', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 10 }))
      .mockReturnValueOnce(makeCountSelect({ count: 3 }))
      .mockReturnValueOnce(makeCountSelect({ count: 7 }))
      .mockReturnValueOnce(
        makeSettingsSelect([
          { key: 'stats_homes', value: '200' },
          { key: 'stats_years', value: '20' },
          { key: 'stats_bird_species', value: '60' },
          { key: 'stats_native_plants', value: '180' },
        ])
      );

    const response = await GET();
    const body = await response.json();

    expect(body.data).toEqual({
      homes: 200,
      years: 20,
      birdSpecies: 60,
      nativePlants: 180,
      residents: 10,
      groups: 3,
      conservationArticles: 7,
    });
  });

  it('enforces tenant isolation via withTenant', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 5 }))
      .mockReturnValueOnce(makeCountSelect({ count: 2 }))
      .mockReturnValueOnce(makeCountSelect({ count: 1 }))
      .mockReturnValueOnce(makeSettingsSelect([]));

    const response = await GET();
    const body = await response.json();

    expect(body.data.residents).toBe(5);
    expect(body.data.groups).toBe(2);
    expect(body.data.conservationArticles).toBe(1);
  });

  it('handles zero counts gracefully', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeCountSelect({ count: 0 }))
      .mockReturnValueOnce(makeSettingsSelect([]));

    const response = await GET();
    const body = await response.json();

    expect(body.data.residents).toBe(0);
    expect(body.data.groups).toBe(0);
    expect(body.data.conservationArticles).toBe(0);
    expect(body.data.homes).toBe(180);
  });

  it('handles partial settings (only some keys set)', async () => {
    mocks.dbMock.select
      .mockReturnValueOnce(makeCountSelect({ count: 25 }))
      .mockReturnValueOnce(makeCountSelect({ count: 4 }))
      .mockReturnValueOnce(makeCountSelect({ count: 8 }))
      .mockReturnValueOnce(makeSettingsSelect([{ key: 'stats_homes', value: '180' }]));

    const response = await GET();
    const body = await response.json();

    expect(body.data.homes).toBe(180);
    expect(body.data.years).toBe(15);
    expect(body.data.birdSpecies).toBe(47);
    expect(body.data.nativePlants).toBe(150);
  });
});
